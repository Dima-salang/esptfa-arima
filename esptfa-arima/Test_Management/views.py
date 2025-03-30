from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from Authentication.models import Teacher
from arima_model.arima_model import arima_driver
from django.views.generic import ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from .models import AnalysisDocument, FormativeAssessmentScore, PredictedScore


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
            try:
                document = form.save(commit=False)
                document.teacher_id = teacher
                document.save()
                messages.success(request, "Document uploaded successfully! Processing....")

                # Process the document
                arima_driver(document)


                return redirect("formative_assessment_dashboard")  # Redirect after success
            except Exception as e:
                # Catch database/file save issues
                messages.error(request, f"An error occurred: {str(e)}")
        else:
            messages.error(
                request, "Invalid form submission. Please check your inputs.")

    else:
        form = AnalysisDocumentForm()

    return render(request, "upload_document.html", {"form": form})


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

        return context
