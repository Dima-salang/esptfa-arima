from django.shortcuts import render, redirect
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
from .models import AnalysisDocument, FormativeAssessmentScore, PredictedScore, TestTopicMapping, TestTopic


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
    pk_url_kwarg = "pk"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        document = self.get_object()

        # Get assessments and predicted scores related to this document
        context["assessments"] = FormativeAssessmentScore.objects.filter(
            analysis_document=document)
        context["predictions"] = PredictedScore.objects.filter(
            analysis_document=document)
        
        # Get test topics for this document
        context["test_topics"] = TestTopicMapping.objects.filter(
            analysis_document=document).order_by('test_number')

        # Create a mapping of test number to topic for easy access in templates
        test_topic_dict = {
            mapping.test_number: mapping.topic.topic_name
            for mapping in context["test_topics"]
        }
        context["test_topic_dict"] = test_topic_dict

        # get necessary statistics
        


        return context


