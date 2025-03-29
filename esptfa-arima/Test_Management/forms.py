from django import forms
from .models import AnalysisDocument


class AnalysisDocumentForm(forms.ModelForm):
    class Meta:
        model = AnalysisDocument
        fields = ['analysis_doc_title',
                  'analysis_doc', 'section_id', 'quarter', 'subject']
