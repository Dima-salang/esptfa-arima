from django.test import TestCase
from django.contrib.auth.models import User
from .forms import UserRegisterForm
from django.urls import reverse
# Create your tests here.

class RegisterTest(TestCase):
    def setUp(self):
        """ Set up test client and user """
        self.user = User.objects.create_user(
            username="testuser", password="password123")
        
    def test_register(self):
        """ Test if the register page renders correctly. """
        response = self.client.get(reverse("register"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "registration/register.html")
        self.assertIsInstance(response.context["form"], UserRegisterForm)

    def test_register_post(self):
        """ Test if the register form is valid and creates a new user. """
        response = self.client.post(reverse("register"), {
            "username": "testuser2",
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser2@example.com",
            "password1": "ThisisATestPassword0011",
            "password2": "ThisisATestPassword0011",
        }, follow=True)

        # Debugging: Print form errors if validation fails
        if response.context and "form" in response.context:
            print(response.context["form"].errors)
        # set user to active
        user = User.objects.get(username="testuser2")
        user.is_active = True
        user.save()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username="testuser2").exists())
    
    def test_user_inactive(self):
        """ Test if the user is inactive after registration. """
        response = self.client.post(reverse("register"), {
            "username": "testuser3",
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser3@example.com",
            "password1": "ThisisATestPassword0011",
            "password2": "ThisisATestPassword0011",
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username="testuser3").exists())
        self.assertFalse(User.objects.get(username="testuser3").is_active)
    

    def test_redirect(self):
        """ Test if the user is redirected to the home page after registration. """
        response = self.client.post(reverse("register"), {
            "username": "testuser4",
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser4@example.com",  # Add the email field
            "password1": "ThisisATestPassword0011",
            "password2": "ThisisATestPassword0011",
        }, follow=False)  # Set follow=False to check the redirect

        self.assertEqual(response.status_code, 302)  # Check for redirect status
        self.assertRedirects(response, reverse("home"))  # Verify the redirect URL

