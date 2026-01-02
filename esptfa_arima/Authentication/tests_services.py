from django.test import TestCase
from django.contrib.auth.models import User
from Authentication.models import Teacher, Student
from Authentication.services import register_user, login_user
from Test_Management.models import Section
from model_types import ACC_TYPE

class RegisterUserTestCase(TestCase):
    def setUp(self):
        # Create a section since Student model requires it
        self.section = Section.objects.create(section_name="Test Section")

    def test_register_teacher(self):
        """Test registration of a teacher user."""
        username = "teacher1"
        password = "password123"
        first_name = "Teacher"
        middle_name = "M"
        last_name = "User"
        email = "teacher@example.com"
        
        user = register_user(
            username=username,
            password=password,
            first_name=first_name,
            middle_name=middle_name, 
            last_name=last_name,
            email=email,
            acc_type=ACC_TYPE.TEACHER
        )
        
        # Verify user creation
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, username)
        self.assertEqual(user.first_name, first_name)
        self.assertEqual(user.last_name, last_name)
        self.assertEqual(user.email, email)
        self.assertFalse(user.is_active)
        
        # Verify Teacher entry creation
        self.assertTrue(Teacher.objects.filter(user_id=user).exists())
        self.assertFalse(Student.objects.filter(user_id=user).exists())

    def test_register_student(self):
        """Test registration of a student user."""
        username = "student1"
        password = "password123"
        first_name = "Student"
        middle_name = "M"
        last_name = "User"
        email = "student@example.com"
        lrn = "12345678901"
        
        user = register_user(
            username=username,
            password=password,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            email=email,
            acc_type=ACC_TYPE.STUDENT,
            lrn=lrn,
            section_id=self.section.section_id
        )
        
        # Verify user creation
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, username)
        self.assertFalse(user.is_active)
        
        # Verify Student entry creation
        student = Student.objects.get(user_id=user)
        self.assertEqual(student.lrn, lrn)
        self.assertEqual(student.section, self.section)
        self.assertFalse(Teacher.objects.filter(user_id=user).exists())


    def test_register_user_duplicate_username(self):
        """Test that registering a user with an existing username raises an error."""
        username = "testuser"
        register_user(
            username=username,
            password="password123",
            first_name="First",
            middle_name="M",
            last_name="Last",
            email="test1@example.com",
            acc_type=ACC_TYPE.TEACHER
        )
        
        from django.db import IntegrityError
        with self.assertRaises(Exception): # User.objects.create_user handles duplicates by raising error or similar
            register_user(
                username=username,
                password="password456",
                first_name="Other",
                last_name="User",
                email="test2@example.com",
                acc_type=ACC_TYPE.TEACHER
            )


class LoginUserTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="password123")

    def test_login_user(self):
        # try with correct username and password
        self.assertTrue(login_user("testuser", "password123"))
        # try with correct username and wrong password
        self.assertFalse(login_user("testuser", "password456"))

    def test_login_user_inactive(self):
        # try with inactive user
        self.user.is_active = False
        self.user.save()
        self.assertFalse(login_user("testuser", "password123"))