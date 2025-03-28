from django.shortcuts import render, redirect
from .forms import AnalysisDocumentForm


def upload_analysis_document(request):
    if request.method == "POST":
        form = AnalysisDocumentForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            # Redirect to a success page or list
            return redirect('upload_document')
    else:
        form = AnalysisDocumentForm()

    return render(request, "upload_document.html", {"form": form})
