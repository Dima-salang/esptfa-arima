from django.urls import path
from .views import upload_analysis_document

urlpatterns = [
    path("upload-document/", upload_analysis_document, name="upload_document"),
]
