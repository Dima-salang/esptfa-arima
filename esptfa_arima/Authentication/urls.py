from django.urls import path
from django.contrib.auth import views as auth_views
from .views import register
from rest_framework.routers import DefaultRouter
from .views import RegisterViewSet, LoginViewSet
from .views import TeacherViewSet, StudentViewSet

urlpatterns = [
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
]

# router for auth
router = DefaultRouter()
router.register(r'login', LoginViewSet, basename='rest-login')
router.register(r'register', RegisterViewSet, basename='register')
router.register(r'teacher', TeacherViewSet, basename='teacher')
router.register(r'student', StudentViewSet, basename='student')
urlpatterns += router.urls
