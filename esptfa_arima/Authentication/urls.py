from django.urls import path
from django.contrib.auth import views as auth_views
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    RegisterViewSet, 
    LoginViewSet, 
    TeacherViewSet, 
    StudentViewSet,
    LogoutViewSet
)

urlpatterns = [
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]

# router for auth
router = DefaultRouter()
router.register(r'login', LoginViewSet, basename='rest-login')
router.register(r'register', RegisterViewSet, basename='register')
router.register(r'teacher', TeacherViewSet, basename='teacher')
router.register(r'student', StudentViewSet, basename='student')
router.register(r'logout', LogoutViewSet, basename='logout')
urlpatterns += router.urls
