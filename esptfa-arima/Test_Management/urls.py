from django.urls import path
from .views import upload_analysis_document
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("upload-document/", upload_analysis_document, name="upload_document"),
]
