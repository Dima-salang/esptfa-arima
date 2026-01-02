from django.test import TestCase
import pandas as pd
import io
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from Authentication.services import process_csv_import
from Authentication.models import Student
from Test_Management.models import Section

class ProcessCSVImportTestCase(TestCase):
    
    def setUp(self):
        # Create some sections for testing
        self.section1 = Section.objects.create(section_name="Diamond")
        self.section2 = Section.objects.create(section_name="Emerald")

    def create_csv_file(self, data, filename="students.csv"):
        df = pd.DataFrame(data)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        content = csv_buffer.getvalue().encode('utf-8')
        return SimpleUploadedFile(filename, content, content_type="text/csv")

    def test_process_csv_import_success(self):
        """Test successful import of valid student data."""
        data = {
            "lrn": ["11111111111", "22222222222"],
            "first_name": ["John", "Jane"],
            "middle_name": ["D", "E"],
            "last_name": ["Doe", "Smith"],
            "section": ["Diamond", "Emerald"]
        }
        csv_file = self.create_csv_file(data)
        
        process_csv_import(csv_file)
        
        self.assertEqual(Student.objects.count(), 2)
        s1 = Student.objects.get(lrn="11111111111")
        self.assertEqual(s1.first_name, "John")
        self.assertEqual(s1.section, self.section1)
        
        s2 = Student.objects.get(lrn="22222222222")
        self.assertEqual(s2.first_name, "Jane")
        self.assertEqual(s2.section, self.section2)

    def test_process_csv_import_missing_columns(self):
        """Test import fails when required columns are missing."""
        data = {
            "lrn": ["11111111111"],
            "first_name": ["John"],
            # missing last_name, section, etc.
        }
        csv_file = self.create_csv_file(data)
        
        with self.assertRaises((ValidationError, DRFValidationError)) as cm:
            process_csv_import(csv_file)
        
        self.assertIn("CSV file must have the following columns", str(cm.exception))

    def test_process_csv_import_invalid_section(self):
        """Test import fails when a section does not exist."""
        data = {
            "lrn": ["11111111111"],
            "first_name": ["John"],
            "middle_name": ["D"],
            "last_name": ["Doe"],
            "section": ["NonExistentSection"]
        }
        csv_file = self.create_csv_file(data)
        
        with self.assertRaises((ValidationError, DRFValidationError)) as cm:
            process_csv_import(csv_file)
        
        self.assertIn("does not exist", str(cm.exception))

    def test_process_csv_import_duplicate_lrn_in_database(self):
        """Test import fails if LRN already exists (since it's a PK)."""
        # Pre-create a student
        Student.objects.create(
            lrn="11111111111",
            first_name="Existing",
            section=self.section1
        )
        
        data = {
            "lrn": ["11111111111"],
            "first_name": ["New"],
            "middle_name": ["D"],
            "last_name": ["Doe"],
            "section": ["Diamond"]
        }
        csv_file = self.create_csv_file(data)
        
        with self.assertRaises((ValidationError, DRFValidationError)):
            process_csv_import(csv_file)

    def test_process_csv_import_empty_file(self):
        """Test importing an empty file."""
        csv_file = SimpleUploadedFile("empty.csv", b"", content_type="text/csv")
        
        with self.assertRaises((ValidationError, DRFValidationError)):
            process_csv_import(csv_file)

    def test_process_csv_import_case_sensitivity_and_whitespace(self):
        """
        Verify that uppercase headers and whitespace in values are handled correctly.
        """
        data = {
            " LRN ": ["11111111111 "],
            "FIRST_NAME": [" John"],
            "middle_name": ["D"],
            "LAST_NAME": ["Doe"],
            "SECTION": [" Diamond "]
        }
        csv_file = self.create_csv_file(data)
        
        process_csv_import(csv_file)
        
        student = Student.objects.get(lrn="11111111111")
        self.assertEqual(student.first_name, "John")
        self.assertEqual(student.section, self.section1)
