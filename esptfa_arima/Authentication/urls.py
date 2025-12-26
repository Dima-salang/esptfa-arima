from django.urls import path
from django.contrib.auth import views as auth_views
from .views import register
from rest_framework.routers import DefaultRouter
from .views import RegisterViewSet


urlpatterns = [
    path("login/", auth_views.LoginView.as_view(), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("register/", register, name="register"),
]

# router for auth
router = DefaultRouter()
router.register(r'register', RegisterViewSet, basename='register')

urlpatterns += router.urls
