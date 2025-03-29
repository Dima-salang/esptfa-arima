from django.shortcuts import render, redirect
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from .models import Teacher

@login_required
def upload_analysis_document(request):
    teacher = Teacher.objects.get(user=request.user)

    if request.method == "POST":
        form = AnalysisDocumentForm(request.POST, request.FILES)
        if form.is_valid():
            document = form.save(commit=False)
            document.teacher = teacher  # Assign logged-in user as the teacher
            document.save()

            # Redirect to a success page or list
            return redirect('upload_document')
    else:
        form = AnalysisDocumentForm()

    return render(request, "upload_document.html", {"form": form})


def home(request):
    return render(request, "home.html")