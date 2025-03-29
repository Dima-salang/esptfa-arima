from django import forms
from .models import AnalysisDocument
from django.contrib import messages
import os


class AnalysisDocumentForm(forms.ModelForm):
    class Meta:
        model = AnalysisDocument
        fields = ['analysis_doc_title',
                  'analysis_doc', 'section_id', 'quarter', 'subject']
        
    def clean(self):
        cleaned_data = super().clean()

        return cleaned_data


    def clean_analysis_doc(self):
        file = self.cleaned_data.get("analysis_doc")

        if file:
            allowed_extensions = [".csv", ".xls", ".xlsx"]
            ext = os.path.splitext(file.name)[1].lower()

            if ext not in allowed_extensions:
                raise forms.ValidationError(
                    "Invalid file format. Please upload a CSV or Excel file.")

            # (Optional) MIME type validation for extra security
            allowed_types = [
                "text/csv",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ]
            if file.content_type not in allowed_types:
                raise forms.ValidationError(
                    "Invalid file type. Only CSV and Excel files are allowed.")

            # Validate file size (Max: 5MB)
            max_size = 5 * 1024 * 1024  # 5MB
            if file.size > max_size:
                raise forms.ValidationError("File size must be under 5MB.")

        return file
