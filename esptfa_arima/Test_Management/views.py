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
from .models import AnalysisDocument, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, TestTopicMapping, TestTopic, FormativeAssessmentStatistic, StudentScoresStatistic
from django.db.models import Avg, Max, Min, F
import logging

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
                document.delete()
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
        predictions = list(PredictedScore.objects.filter(analysis_document=document))
        test_topics = list(TestTopicMapping.objects.filter(analysis_document=document).order_by('test_number'))
        individual_fas = list(FormativeAssessmentStatistic.objects.filter(analysis_document=document))
        context["analysis_doc_statistic"] = AnalysisDocumentStatistic.objects.filter(analysis_document=document)
        # 2. Prepare Data for Score Distribution Chart (Dynamic Ranges)
        score_distribution_data = self.prepare_score_distribution_data(assessments)
        context["score_distribution_data"] = score_distribution_data

        # 3. Prepare Data for Test Performance Chart (Dynamic Thresholds)
        test_performance_data = self.prepare_test_performance_data(individual_fas, assessments)
        context["test_performance_data"] = test_performance_data

        # 4. Prepare Data for Topic Performance Heatmap
        topic_heatmap_data = self.prepare_topic_heatmap_data(assessments, test_topics)
        context["topic_heatmap_data"] = topic_heatmap_data

        # 5. Other Context Data (Keep as is)
        context["assessments"] = FormativeAssessmentScore.objects.filter(analysis_document=document)
        context["predictions"] = PredictedScore.objects.filter(
            analysis_document=document)
        context["test_topics"] = TestTopicMapping.objects.filter(
            analysis_document=document).order_by('test_number')
        context["individual_formative_assessments"] = FormativeAssessmentStatistic.objects.filter(
            analysis_document=document)
        
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

        # log all data
        logger.info(f"assessments: {context['assessments']}")
        logger.info(f"predictions: {context['predictions']}")
        logger.info(f"test_topics: {context['test_topics']}")
        logger.info(f"individual_fas: {context['individual_formative_assessments']}")
        logger.info(f"score_distribution_data: {context['score_distribution_data']}")
        logger.info(f"test_performance_data: {context['test_performance_data']}")
        logger.info(f"topic_heatmap_data: {context['topic_heatmap_data']}")
        logger.info(f"test_topic_dict: {context['test_topic_dict']}")

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

    def prepare_topic_heatmap_data(self, assessments, test_topics):
        """ Prepares data for the topic performance heatmap. """
        heatmap_data = []
        unique_student_ids = []
        unique_fa_numbers = []
        max_score = max(assessment.score for assessment in assessments)
        
        for i, assessment in enumerate(assessments):
            normalized_score = assessment.score / max_score
            fa_number = int(assessment.formative_assessment_number)
            heatmap_data.append({
                'x': i,
                'y': fa_number,
                'value': normalized_score,
            })
            unique_student_ids.append(assessment.student_id)
            unique_fa_numbers.append(fa_number)

        unique_student_ids = list(set(unique_student_ids))
        unique_fa_numbers = list(set(unique_fa_numbers))

        
        return {
            "data": heatmap_data,
            "width": len(unique_student_ids),
            "height": len(unique_fa_numbers),
            "max": max_score
        }


class IndividualFADetailView(LoginRequiredMixin, DetailView):
    model = FormativeAssessmentStatistic
    template_name = "fa_detail.html"
    context_object_name = "fa_statistic"
    pk_url_kwarg = "fa_pk"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
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
            student_id=student_statistic.student
        )
        return context