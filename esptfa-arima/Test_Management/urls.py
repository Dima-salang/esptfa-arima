from django.urls import path
from .views import upload_analysis_document, home
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("", home, name="home"),
    path("upload-document/", upload_analysis_document, name="upload_document"),
]
