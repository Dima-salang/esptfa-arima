from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.forms import forms
from arima_model.tasks import process_analysis_document
from django.core.exceptions import ObjectDoesNotExist
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from Authentication.models import Teacher
from arima_model.arima_model import arima_driver
from django.views.generic import ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import AnalysisDocument, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, StudentScoresStatistic, TestTopicMapping, TestTopic, FormativeAssessmentStatistic, StudentScoresStatistic
from django.db.models import Avg, Max, Min, F, ExpressionWrapper, FloatField
import logging
from django.db import transaction

logger = logging.getLogger("arima_model")

@login_required
def upload_analysis_document(request):
    """Handle document uploads with error handling."""
    try:
        teacher = Teacher.objects.get(user_id=request.user)
    except ObjectDoesNotExist:
        messages.error(request, "You are not assigned as a teacher.")
        return redirect("home")  # Redirect if user isn't a teacher

    if request.method == "POST":
        form = AnalysisDocumentForm(request.POST, request.FILES)
        if form.is_valid():
            with transaction.atomic():

                document = form.save(commit=False)
                document.teacher_id = teacher
                # process the document and check if there are errors
                document.save()

                # Process test topics if provided
                test_topics_str = form.cleaned_data.get('test_topics', '')
                if test_topics_str:
                    process_test_topics(document, test_topics_str)
                else:
                    # If no topics provided, use default naming based on CSV columns
                    process_default_topics(document, form.test_columns)

                try:
                    # try and process the document
                    process_analysis_document.delay(document.analysis_document_id)

                except Exception as e:
                    messages.error(
                        request, "Error processing the document: " + str(e))
                messages.success(
                    request, "Document uploaded successfully! Please wait at least 5 minutes for the analysis to finish.")

                # Redirect after success
                return redirect("formative_assessment_dashboard")
        
        else:
            messages.error(
                request, "Invalid form submission. Please check your inputs.")

    else:
        form = AnalysisDocumentForm()

    return render(request, "upload_document.html", {"form": form})


def process_test_topics(document, topics_str):
    """Process the user-provided topic strings and create mappings. Returns the topic entries"""
    # Split by commas or new lines
    topic_entries = [entry.strip() for entry in topics_str.replace(
        '\n', ',').split(',') if entry.strip()]

    for entry in topic_entries:
        if ':' in entry:
            test_num, topic_name = entry.split(':', 1)
            test_num = test_num.strip()
            topic_name = topic_name.strip()

            # Skip if either part is empty
            if not test_num or not topic_name:
                continue

            # Remove "Test" prefix if present
            if test_num.lower().startswith('fa'):
                test_num = test_num[2:].strip()

            # Get or create the topic (handles duplicates)
            topic = TestTopic.get_or_create_topic(topic_name)

            # Create the mapping
            TestTopicMapping.objects.update_or_create(
                analysis_document=document,
                test_number=test_num,
                defaults={'topic': topic}
            )


def process_default_topics(document, test_columns):
    """Create default topics based on column names."""
    for col in test_columns:
        if col.lower().startswith('fa'):
            test_num = col[2:].strip()  # Extract the number from "TestX"
            topic = TestTopic.get_or_create_topic(f"Topic for Test {test_num}")

            TestTopicMapping.objects.create(
                analysis_document=document,
                test_number=test_num,
                topic=topic
            )


def home(request):
    return render(request, "home.html")


# Dashboard: List all formative assessment documents for the teacher
class FormativeAssessmentDashboardView(LoginRequiredMixin, ListView):
    model = AnalysisDocument
    template_name = "dashboard.html"
    context_object_name = "documents"

    def get_queryset(self):
        # Show only the documents owned by the logged-in teacher
        return AnalysisDocument.objects.filter(teacher_id=self.request.user.teacher)


# Detail View: Show individual formative assessments and predicted scores
class FormativeAssessmentDetailView(LoginRequiredMixin, DetailView):
    model = AnalysisDocument
    template_name = "analysis_doc_detail.html"
    context_object_name = "document"
    pk_url_kwarg = "document_pk"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        document = self.get_object()

        # 1. Fetch Data (Efficiently)
        assessments = list(FormativeAssessmentScore.objects.filter(analysis_document=document))
        test_topics = list(TestTopicMapping.objects.filter(analysis_document=document).order_by('test_number'))
        individual_fas = list(FormativeAssessmentStatistic.objects.filter(analysis_document=document))

        student_stats = StudentScoresStatistic.objects.filter(analysis_document=document)  

        last_fa = len(individual_fas)
        context["last_fa"] = last_fa
        context["last_fa_scores"] = FormativeAssessmentScore.objects.filter(analysis_document=document, formative_assessment_number=context["last_fa"])

        context["analysis_doc_statistic"] = AnalysisDocumentStatistic.objects.filter(analysis_document=document).first()
        # 2. Prepare Data for Score Distribution Chart (Dynamic Ranges)
        score_distribution_data = self.prepare_score_distribution_data(assessments)
        context["score_distribution_data"] = score_distribution_data

        # 3. Prepare Data for Test Performance Chart (Dynamic Thresholds)
        test_performance_data = self.prepare_test_performance_data(individual_fas, assessments)
        context["test_performance_data"] = test_performance_data

        # 5. Other Context Data (Keep as is)
        context["assessments"] = FormativeAssessmentScore.objects.filter(analysis_document=document)
        context["predictions"] = PredictedScore.objects.filter(
            analysis_document=document).annotate(
                gap_to_passing=ExpressionWrapper(
                    F('passing_threshold') - F('score'),
                    output_field=FloatField()
                ),
            )
        for prediction in context["predictions"]:
            context["test_topics"] = TestTopicMapping.objects.filter(
                analysis_document=document).order_by('test_number')
            context["individual_formative_assessments"] = FormativeAssessmentStatistic.objects.filter(
                analysis_document=document).annotate(
                normalized_mean_scaled=ExpressionWrapper(
                    F('mean') / F('max_score') * 100,
                    output_field=FloatField()
                ),
            )
        
        # Serialize test_topics for use in JavaScript
        test_topics_data = [{
            'test_number': topic.test_number,
            'topic_name': topic.topic.topic_name
        } for topic in test_topics]
        context['test_topics_data'] = test_topics_data

        # Create a mapping of test number to topic for easy access in templates
        test_topic_dict = {
            mapping.test_number: mapping.topic.topic_name
            for mapping in test_topics
        }
        context["test_topic_dict"] = test_topic_dict

        # Zip them up by student
        student_data = []
        for score in context["last_fa_scores"]:
            prediction = context["predictions"].filter(
                student_id=score.student_id).first()
            statistic = student_stats.filter(student_id=score.student_id).first()
            if prediction and statistic:
                student_data.append({
                    "student": score.student_id,
                    "last_score": score,
                    "prediction": prediction,
                    "stat": statistic
                })
        context["student_data"] = student_data
        print(f"Passed student data: {student_data}")

        return context

    def prepare_score_distribution_data(self, assessments):
        """ Prepares data for the score distribution chart with dynamic ranges. """
        # Determine score ranges dynamically

        min_score = min(assessment.score for assessment in assessments)
        max_score = max(assessment.score for assessment in assessments)
        range_size = (max_score - min_score) / 5  # Divide into 5 ranges

        # Create dynamic labels and ranges
        labels = []
        ranges = []
        start = min_score
        for i in range(5):
            end = start + range_size
            labels.append(f"{start:.0f}-{end:.0f}")
            ranges.append((start, end))
            start = end

        # Count scores in each range
        data = [sum(1 for assessment in assessments if ranges[i][0] <= assessment.score < ranges[i][1]) for i in range(5)]

        return {
            "labels": labels,
            "data": data,
        }

    def prepare_test_performance_data(self, individual_fas, assessments):
        """ Prepares data for the test performance chart with dynamic passing thresholds. """
        labels, means, passing_thresholds, max_scores = [], [], [], []
        for fa in individual_fas:
            labels.append(f"FA{fa.formative_assessment_number}")
            means.append(fa.mean)
            passing_thresholds.append(fa.passing_threshold)
        
        for fa in assessments:
            max_scores.append(fa.score)
        max_score = max(max_scores)
        return {
            "labels": labels,
            "means": means,
            "passing_thresholds": passing_thresholds,
            "max_score": max_score
        }


class IndividualFADetailView(LoginRequiredMixin, DetailView):
    model = FormativeAssessmentStatistic
    template_name = "fa_detail.html"
    context_object_name = "fa_statistic"
    pk_url_kwarg = "fa_pk"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        fa_statistic = self.get_object()
        analysis_document = fa_statistic.analysis_document
        context["formative_scores"] = FormativeAssessmentScore.objects.filter(
            analysis_document=analysis_document,
            formative_assessment_number=fa_statistic.formative_assessment_number
        )

        context["normalized_mean_scaled"] = fa_statistic.mean / fa_statistic.max_score * 100 if fa_statistic.max_score else 0


        return context


class IndividualStudentDetailView(LoginRequiredMixin, DetailView):
    model = StudentScoresStatistic
    template_name = "student_detail.html"
    context_object_name = "student_statistic"
    pk_url_kwarg = "student_pk"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        student_statistic = self.get_object()
        context["formative_scores"] = FormativeAssessmentScore.objects.filter(
            student_id= student_statistic.student,
            analysis_document = student_statistic.analysis_document
        )
        context["predicted_score"] = PredictedScore.objects.filter(
            student_id=student_statistic.student,
            analysis_document=student_statistic.analysis_document
        )

        print(student_statistic.student.student_id)
        print(student_statistic.student.first_name)
        print(student_statistic.student.last_name)
        print(student_statistic.mean)

        print(student_statistic.lineplot.url if student_statistic.lineplot else None)
        print(student_statistic.heatmap.url if student_statistic.heatmap else None)

        return context