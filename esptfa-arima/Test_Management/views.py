from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from Authentication.models import Teacher
from arima_model.arima_model import arima_driver


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


                return redirect("upload_document")  # Redirect after success
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


def dashboard(request):
    analysis_documents = AnalysisDocumentForm.objects.filter(teacher_id=request.user.teacher)
    context = {"analysis_documents": analysis_documents}
    return render(request, "dashboard.html", context)