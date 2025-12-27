from django import forms
from .models import AnalysisDocument
from pandas import read_csv
import os


class AnalysisDocumentForm(forms.ModelForm):

    test_topics = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'rows': 3}),
        help_text="Enter topics for each test number (e.g., 'FA1: Algebra, FA2: Geometry'). Optional."
    )
    class Meta:
        model = AnalysisDocument
        fields = ['analysis_doc_title',
                  'analysis_doc', 'test_start_date', 'section_id', 'quarter', 'subject', 'test_topics']
        
    def clean(self):
        cleaned_data = super().clean()

        return cleaned_data


    def clean_analysis_doc(self):
        file = self.cleaned_data.get("analysis_doc")

        if file:
            allowed_extensions = [".csv"]
            ext = os.path.splitext(file.name)[1].lower()

            if ext not in allowed_extensions:
                raise forms.ValidationError(
                    "Invalid file format. Please upload a CSV file. If you are using Excel, save it as CSV format.")

            # (Optional) MIME type validation for extra security
            allowed_types = [
                "text/csv",
            ]
            if file.content_type not in allowed_types:
                raise forms.ValidationError(
                    "Invalid file type. Only CSV files are allowed. If you are using Excel, save it as CSV format.")

            # Validate file size (Max: 5MB)
            max_size = 5 * 1024 * 1024  # 5MB
            if file.size > max_size:
                raise forms.ValidationError("File size must be under 5MB.")
            


            # read csv file and check whether the num of tests is not below 5
            test_data = read_csv(file)
            num_tests = test_data.shape[1] - 4

            # Store column names for later processing of test topics
            self.test_columns = [
                col for col in test_data.columns if col.startswith('fa')]
            
            if num_tests < 5:
                raise forms.ValidationError(
                    "The file must contain at least 5 tests.")
        return file
    

    def clean_test_topics(self):
        
        test_topics = self.cleaned_data.get("test_topics")

        topic_entries = [entry.strip() for entry in test_topics.replace(
            '\n', ',').split(',') if entry.strip()]
        num_of_tests = len(self.test_columns)
        num_of_topics = len(topic_entries)

        # check if the number of topics match the number of tests
        if num_of_topics != num_of_tests:
            raise forms.ValidationError(
                f"Number of topics provided ({num_of_topics}) does not match number of tests ({num_of_tests}).")

        return test_topics



