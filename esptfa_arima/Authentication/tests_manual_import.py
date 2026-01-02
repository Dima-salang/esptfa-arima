from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from Authentication.models import Student
from Test_Management.models import Section
from Authentication.services import process_manual_import
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

class ManualImportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.section = Section.objects.create(section_name="Diamond")
        self.admin_user = User.objects.create_superuser(
            username="admin", password="password123", email="admin@example.com"
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_process_manual_import_success(self):
        """Test the service function directly with a section ID."""
        students_data = [
            {
                "lrn": "11111111111",
                "first_name": "John",
                "middle_name": "D",
                "last_name": "Doe",
                "section": self.section.section_id
            }
        ]
        
        process_manual_import(students_data)
        
        self.assertEqual(Student.objects.count(), 1)
        student = Student.objects.get(lrn="11111111111")
        self.assertEqual(student.first_name, "John")
        self.assertEqual(student.section, self.section)

    def test_manual_import_api_success(self):
        """Test the API endpoint with section ID."""
        url = reverse('student-manual-import')
        data = {
            "students": [
                {
                    "lrn": "22222222222",
                    "first_name": "Jane",
                    "middle_name": "E",
                    "last_name": "Smith",
                    "section": self.section.section_id
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Student.objects.filter(lrn="22222222222").exists())

    def test_manual_import_api_permission_denied(self):
        """Test that non-admin users cannot access manual import."""
        regular_user = User.objects.create_user(username="user", password="password123")
        self.client.force_authenticate(user=regular_user)
        
        url = reverse('student-manual-import')
        response = self.client.post(url, {"students": []}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manual_import_duplicate_lrn(self):
        """Test that duplicate LRNs handle errors gracefully."""
        Student.objects.create(lrn="33333333333", first_name="Existing", section=self.section)
        
        students_data = [
            {
                "lrn": "33333333333",
                "first_name": "New",
                "last_name": "User",
                "section": self.section.section_id
            }
        ]
        
        with self.assertRaises((ValidationError, DRFValidationError)):
            process_manual_import(students_data)
