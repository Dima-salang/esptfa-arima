from django.http import HttpRequest
from django.http.response import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.forms import forms
from arima_model.tasks import process_analysis_document
from django.core.exceptions import ObjectDoesNotExist
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from Authentication.models import Teacher
from arima_model.arima_model import arima_driver, preprocess_data
from arima_model.visualization_manager import generate_heatmap, generate_student_line_chart, generate_score_dist_chart, generate_boxplot, generate_bar_chart, generate_student_vs_class_chart, generate_student_comparison_chart
from django.views.generic import ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import AnalysisDocument, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, StudentScoresStatistic, TestTopicMapping, TestTopic, FormativeAssessmentStatistic, StudentScoresStatistic
from django.db.models import Avg, Max, Min, F, ExpressionWrapper, FloatField
import logging
from django.db import transaction
from django.core.files.base import ContentFile
from utils.decorators.decorators import teacher_required
from utils.mixins.mixins import TeacherRequiredMixin
from utils.insights import get_visualization_insights, get_gemini_insights
logger = logging.getLogger("arima_model")
import pandas as pd

@login_required
@teacher_required
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
class FormativeAssessmentDashboardView(LoginRequiredMixin, TeacherRequiredMixin, ListView):
    model = AnalysisDocument
    template_name = "dashboard.html"
    context_object_name = "documents"
    paginate_by = 10

    def get_queryset(self):
        # Show only the documents owned by the logged-in teacher and show the most recent ones
       return AnalysisDocument.objects.filter(teacher_id=self.request.user.teacher).order_by('-upload_date')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["documents"] = context["page_obj"]
        return context


# Detail View: Show individual formative assessments and predicted scores
class FormativeAssessmentDetailView(LoginRequiredMixin, TeacherRequiredMixin, DetailView):
    model = AnalysisDocument
    template_name = "analysis_doc_detail.html"
    context_object_name = "document"
    pk_url_kwarg = "document_pk"


    def dispatch(self, request, *args, **kwargs):
        document = self.get_object()
        if not document.status:
            messages.info(request, message="The document is still being processed. Please check back later by refreshing the page.")
            return redirect("formative_assessment_dashboard")
        return super().dispatch(request, *args, **kwargs)

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

        document_statistic = AnalysisDocumentStatistic.objects.filter(analysis_document=document).first()
        context["analysis_doc_statistic"] = document_statistic
        
        # Generate document-level insights
        if document_statistic:
            # Convert assessments to DataFrame for insight generation
            import pandas as pd
            
            # Create a DataFrame from all assessments
            all_scores_data = []
            for assessment in assessments:
                all_scores_data.append({
                    'student_id': assessment.student_id.student_id,
                    'test_number': assessment.formative_assessment_number,
                    'score': assessment.score,
                    'max_score': assessment.passing_threshold / 0.75, # Reconstruct max score
                    'passing_threshold': assessment.passing_threshold,
                    'normalized_scores': assessment.score / (assessment.passing_threshold / 0.75)
                })
            
            if all_scores_data:
                processed_data = pd.DataFrame(all_scores_data)
                
                # Generate overall document insights
                document_stats = {
                    "mean": document_statistic.mean,
                    "median": document_statistic.median, 
                    "standard_deviation": document_statistic.standard_deviation,
                    "minimum": document_statistic.minimum,
                    "maximum": document_statistic.maximum,
                    "mean_passing_threshold": document_statistic.mean_passing_threshold
                }
                
                assessment_count = processed_data["test_number"].nunique()
                student_count = processed_data["student_id"].nunique()
                
                overall_insights = get_visualization_insights(
                    'overall', 
                    document_stats,
                    assessment_count,
                    student_count
                )
                
                # Generate heatmap insights
                heatmap_insights = get_visualization_insights(
                    'heatmap',
                    processed_data,
                    value_column="normalized_scores"
                )
                
                context['insights'] = {
                    'overall': overall_insights,
                    'heatmap': heatmap_insights
                }

                try:
                    context['gemini_insights'] = get_gemini_insights(context['insights'])
                except Exception as e:
                    logger.error(f"Error generating gemini insights: {e}")
                    context['gemini_insights'] = None
                
                # Add actionable recommendations
                context['actionable_insights'] = []
                if 'actionable' in overall_insights:
                    context['actionable_insights'].extend(overall_insights['actionable'])
                if 'actionable' in heatmap_insights:
                    for item in heatmap_insights['actionable']:
                        if item not in context['actionable_insights']:
                            context['actionable_insights'].append(item)
                
                # Add notable student lists from heatmap insights
                if 'outliers' in heatmap_insights:
                    context['high_performers'] = heatmap_insights['outliers'].get('high_performers', [])
                    context['low_performers'] = heatmap_insights['outliers'].get('low_performers', [])
                    context['inconsistent_performers'] = heatmap_insights['outliers'].get('inconsistent_performers', [])
        
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


class IndividualFADetailView(LoginRequiredMixin, TeacherRequiredMixin, DetailView):
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

        # Generate insights for the visualizations
        import pandas as pd
        fa_data = pd.DataFrame(list(context["formative_scores"].values(
            'student_id__student_id', 'student_id__first_name', 
            'student_id__last_name', 'score'
        )))
        
        if not fa_data.empty:
            # Rename columns for compatibility with insight generator
            fa_data.rename(columns={
                'student_id__student_id': 'student_id',
                'student_id__first_name': 'first_name',
                'student_id__last_name': 'last_name'
            }, inplace=True)
            
            # Generate insights
            topic = fa_statistic.fa_topic.topic_name if fa_statistic.fa_topic else None
            
            distribution_insights = get_visualization_insights(
                'distribution',
                fa_data['score'],
                fa_number=int(fa_statistic.formative_assessment_number),
                topic=topic
            )
            
            bar_insights = get_visualization_insights(
                'bar_chart',
                fa_data['student_id'].tolist(),
                fa_data['score'].tolist(),
                fa_number=int(fa_statistic.formative_assessment_number),
                topic=topic
            )
            
            # Generate student comparison insights
            student_comparison_insights = get_visualization_insights(
                'student_comparison',
                fa_data['student_id'].tolist(),
                fa_data['score'].tolist(),
                class_average=fa_data['score'].mean(),
                passing_threshold=fa_statistic.passing_threshold,
                fa_number=int(fa_statistic.formative_assessment_number),
                topic=topic
            )
            
            context['insights'] = {
                'distribution': distribution_insights,
                'bar_chart': bar_insights,
                'student_comparison': student_comparison_insights
            }
            
            # Add actionable recommendations
            context['actionable_insights'] = []
            if 'actionable' in distribution_insights:
                context['actionable_insights'].extend(distribution_insights['actionable'])
            if 'actionable' in bar_insights:
                for item in bar_insights['actionable']:
                    if item not in context['actionable_insights']:
                        context['actionable_insights'].append(item)
            if 'actionable' in student_comparison_insights:
                for item in student_comparison_insights['actionable']:
                    if item not in context['actionable_insights']:
                        context['actionable_insights'].append(item)

        return context

    def dispatch(self, request, *args, **kwargs):
        fa_statistic = self.get_object()
        analysis_document = fa_statistic.analysis_document
        if True:  # Always regenerate charts to ensure we use the latest implementation
            with transaction.atomic():
                try:
                    fa_number = int(fa_statistic.formative_assessment_number)
                    preprocessed_data = preprocess_data(analysis_document)
                    fa_data = preprocessed_data[preprocessed_data["test_number"] == fa_number]

                    # generate charts at runtime
                    histogram_image = generate_score_dist_chart(fa_data, fa_number)
                    histogram_filename = f"histogram_{analysis_document.pk}_{fa_number}.png"

                    boxplot_image = generate_boxplot(fa_data, fa_number)
                    boxplot_filename = f"boxplot_{analysis_document.pk}_{fa_number}.png"

                    bar_chart_image = generate_bar_chart(fa_data, fa_number)
                    bar_chart_filename = f"bar_chart_{analysis_document.pk}_{fa_number}.png"
                    
                    # Generate student comparison chart
                    student_comparison_chart = generate_student_comparison_chart(fa_data, None, fa_number)
                    student_comparison_filename = f"student_comparison_{analysis_document.pk}_{fa_number}.png"

                    # save images
                    fa_statistic.histogram.save(
                        histogram_filename, ContentFile(histogram_image.read()), save=True)
                    fa_statistic.boxplot.save(
                        boxplot_filename, ContentFile(boxplot_image.read()), save=True)
                    fa_statistic.bar_chart.save(
                        bar_chart_filename, ContentFile(bar_chart_image.read()), save=True)
                    fa_statistic.student_comparison_chart.save(
                        student_comparison_filename, ContentFile(student_comparison_chart.read()), save=True)
                except Exception as e:
                    logger.error(f"Error generating charts: {e}")
                    messages.error(self.request, "Error generating charts.")
                    return redirect("formative_assessment_dashboard")
        return super().dispatch(request, *args, **kwargs)


class IndividualStudentDetailView(LoginRequiredMixin, TeacherRequiredMixin, DetailView):
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
        ).annotate(
            normalized_score_scaled=ExpressionWrapper(
                F('score') / (F('passing_threshold') / 0.75) * 100,
                output_field=FloatField()
            )
        )

        context["test_topics"] = TestTopicMapping.objects.filter(
            analysis_document=student_statistic.analysis_document)
        
        # Generate insights for student performance
        import pandas as pd
        student_data = pd.DataFrame(list(context["formative_scores"].values(
            'formative_assessment_number', 'score', 'passing_threshold'
        )))
        
        if not student_data.empty:
            # Add student_id column for compatibility
            student_data['student_id'] = student_statistic.student.student_id
            
            # Calculate normalized scores for insights
            student_data['max_score'] = student_data['passing_threshold'] / 0.75
            student_data['normalized_scores'] = student_data['score'] / student_data['max_score']
            student_data['test_number'] = student_data['formative_assessment_number'].astype(int)
            
            # Get predicted score if available
            predicted_score_obj = context["predicted_score"].first()
            predicted_score = predicted_score_obj.score if predicted_score_obj else None
            
            try:
                # Generate performance trend insights
                line_insights = get_visualization_insights(
                    'line_chart',
                    student_data['normalized_scores'] * 100,  # As percentage
                    student_data['test_number'].tolist(),
                    predicted_score
                )
                
                # Generate topic-specific insights
                test_topic_data = []
                for _, row in student_data.iterrows():
                    test_num = int(row['formative_assessment_number'])
                    topic_obj = TestTopicMapping.objects.filter(
                        analysis_document=student_statistic.analysis_document,
                        test_number=test_num
                    ).first()
                    
                    if topic_obj:
                        test_topic_data.append({
                            'test_number': test_num,
                            'topic': topic_obj.topic.topic_name,
                            'score': row['score'],
                            'normalized_score': row['normalized_scores'] * 100,
                        })
                
                # Group by topic and analyze performance
                topic_insights = []
                if test_topic_data:
                    topics_df = pd.DataFrame(test_topic_data)
                    for topic, group in topics_df.groupby('topic'):
                        avg_score = group['normalized_score'].mean()
                        if avg_score >= 90:
                            topic_insights.append(f"Strong performance in {topic} (avg {avg_score:.1f}%)")
                        elif avg_score >= 75:
                            topic_insights.append(f"Good understanding of {topic} (avg {avg_score:.1f}%)")
                        elif avg_score >= 60:
                            topic_insights.append(f"Average performance in {topic} (avg {avg_score:.1f}%)")
                        else:
                            topic_insights.append(f"Needs improvement in {topic} (avg {avg_score:.1f}%)")
                
                # Add topic insights to line_insights
                if topic_insights:
                    line_insights['topic_insights'] = topic_insights
                
                context['insights'] = {
                    'line_chart': line_insights
                }
                
                # Generate comparison insights
                # Get all scores for the document (for class comparison)
                all_scores = FormativeAssessmentScore.objects.filter(
                    analysis_document=student_statistic.analysis_document
                )
                
                if all_scores.exists():
                    # Prepare data for comparison insights
                    student_scores = student_data["score"].tolist()
                    test_numbers = student_data["test_number"].tolist()
                    
                    # Calculate class averages for each test
                    class_data = pd.DataFrame(list(all_scores.values('formative_assessment_number', 'score')))
                    class_data['test_number'] = class_data['formative_assessment_number'].astype(int)
                    
                    class_averages = []
                    for test_num in test_numbers:
                        test_data = class_data[class_data['test_number'] == test_num]
                        class_avg = test_data['score'].mean()
                        class_averages.append(class_avg)
                    
                    comparison_insights = get_visualization_insights(
                        'student_vs_class_comparison',
                        test_numbers,
                        student_scores,
                        class_averages,
                        student_id=student_statistic.student.student_id,
                        student_name=f"{student_statistic.student.first_name} {student_statistic.student.last_name}"
                    )
                    
                    # Add comparison insights to context
                    context['insights']['comparison'] = comparison_insights
                
                # Add actionable recommendations
                context['actionable_insights'] = []
                if 'actionable' in line_insights:
                    context['actionable_insights'].extend(line_insights['actionable'])
                if 'comparison' in context['insights'] and 'actionable' in context['insights']['comparison']:
                    for item in context['insights']['comparison']['actionable']:
                        if item not in context['actionable_insights']:
                            context['actionable_insights'].append(item)
                    
                logger.info(f"Generated insights for student {student_statistic.student.student_id}")
            except Exception as e:
                logger.error(f"Error generating insights: {str(e)}")
                context['insights'] = {
                    'line_chart': {
                        'summary': "Unable to generate insights due to insufficient data or an error."
                    }
                }

        return context


    def get_object(self, queryset=None):
        student_statistic = super().get_object(queryset) 
        if not student_statistic.heatmap or not student_statistic.lineplot or not student_statistic.performance_comparison_chart:
            with transaction.atomic():
                # fetch the analysis document to which this student statistic belongs
                try:
                    analysis_document = student_statistic.analysis_document
                    student_id = student_statistic.student.student_id
                    
                    preprocessed_data = preprocess_data(analysis_document)

                    student_data = preprocessed_data[preprocessed_data["student_id"] == student_id]
                    
                    # generate charts at runtime
                    heatmap_image = generate_heatmap(
                        student_data, "normalized_scores", title="Heatmap of Normalized Scores of Students Per FA in Percentage")
                    heatmap_filename = f"student_heatmap_{analysis_document.pk}_{student_id}.png"

                    lineplot = generate_student_line_chart(student_data, analysis_document)
                    lineplot_filename = f"student_line_plot_{analysis_document.pk}_{student_id}.png"
                    
                    # Generate comparison chart
                    performance_comparison_chart = None
                    # Get all scores for the document (for class comparison)
                    class_data = preprocessed_data[preprocessed_data["student_id"] != student_id]
                    if not class_data.empty:
                        class_data.rename(columns={'formative_assessment_number': 'test_number'}, inplace=True)
                        print(f"DEBUG student_data: {student_data.head()}")
                        print(f"DEBUG class_data: {class_data.head()}")
                        performance_comparison_chart = generate_student_vs_class_chart(student_data, class_data)
                        comparison_filename = f"performance_comparison_{analysis_document.pk}_{student_id}.png"

                    # save images
                    student_statistic.heatmap.save(
                        heatmap_filename, ContentFile(heatmap_image.read()), save=True)
                    student_statistic.lineplot.save(
                        lineplot_filename, ContentFile(lineplot.read()), save=True)
                    
                    # Save comparison chart if generated
                    if performance_comparison_chart:
                        student_statistic.performance_comparison_chart.save(
                            comparison_filename, ContentFile(performance_comparison_chart.read()), save=True)

                except Exception as e:
                    logger.error(f"Error generating charts: {e}")
                    messages.error(self.request, "Error generating charts.")
                    return redirect("formative_assessment_dashboard")
        return student_statistic