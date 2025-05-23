from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from Authentication.models import Teacher
from Test_Management.models import AnalysisDocument, Section, Subject, Quarter
from Test_Management.forms import AnalysisDocumentForm
from django.core.files.uploadedfile import SimpleUploadedFile
import os
from django.conf import settings


class UploadAnalysisDocumentTest(TestCase):
    def setUp(self):
        """Set up a user, teacher, and section for testing."""
        self.user = User.objects.create_user(
            username="testuser", password="password123")
        self.section = Section.objects.create(section_name="Test Section")
        self.teacher = Teacher.objects.create(
            teacher_id="T001", user_id=self.user)
        self.subject = Subject.objects.create(subject_name="Test Subject")
        self.quarter = Quarter.objects.create(quarter_name="Q1")

        self.client.login(username="testuser", password="password123")

    def tearDown(self):
        """Delete uploaded files after each test"""
        for doc in AnalysisDocument.objects.all():
            if doc.analysis_doc:  # Ensure there's a file
                print(f"Deleting file: {doc.analysis_doc.path}")
                os.remove(doc.analysis_doc.path)# Delete the file from storage


    def test_upload_document_get(self):
        """Test if the upload form renders correctly."""
        response = self.client.get(reverse("upload_document"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "upload_document.html")
        self.assertIsInstance(response.context["form"], AnalysisDocumentForm)

    def test_upload_document_post_valid(self):
        """Test valid file upload."""
        file = SimpleUploadedFile(
            "test.csv", b"Test file content", content_type="text/csv")
        response = self.client.post(reverse("upload_document"), {
            "analysis_doc_title": "Test Document",
            "test_start_date": "2023-10-01",
            "analysis_doc": file,
            "section_id": self.section.section_id,
            "quarter": self.quarter.quarter_id,
            "subject": self.subject.subject_id,
            "teacher_id": self.teacher
        }, follow=True)

        self.assertEqual(response.status_code, 200)  # Or redirect status (302)
        self.assertTrue(AnalysisDocument.objects.filter(
            analysis_doc_title="Test Document").exists())
        
        
    
    def test_upload_document_post_invalid_type(self):
        """Test invalid file type upload."""
        file = SimpleUploadedFile(
            "test.pdf", b"Test file content", content_type="application/pdf")
        response = self.client.post(reverse("upload_document"), {
            "analysis_doc_title": "Test Document",
            "test_start_date": "2023-10-01",
            "analysis_doc": file,
            "section_id": self.section.section_id,
            "quarter": self.quarter.quarter_id,
            "subject": self.subject.subject_id,
            "teacher_id": self.teacher
        }, follow=True)

        self.assertEqual(response.status_code, 200)  # Or redirect status (302)
        self.assertFalse(AnalysisDocument.objects.filter(
            analysis_doc_title="Test Document").exists())

    def test_upload_document_post_invalid(self):
        """Test invalid file upload (missing fields)."""
        response = self.client.post(
            reverse("upload_document"), {}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AnalysisDocument.objects.exists()
                         )  # No document should be saved

    def test_upload_document_requires_login(self):
        """Ensure that unauthenticated users cannot access the upload page."""
        self.client.logout()
        response = self.client.get(reverse("upload_document"))
        self.assertRedirects(
            response, f"{reverse('login')}?next={reverse('upload_document')}")
