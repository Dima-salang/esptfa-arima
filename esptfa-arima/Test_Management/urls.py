from django.urls import path
from .views import upload_analysis_document, home, FormativeAssessmentDashboardView, FormativeAssessmentDetailView
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("", home, name="home"),
    path("upload-document/", upload_analysis_document, name="upload_document"),
    path("formative-assessments/", FormativeAssessmentDashboardView.as_view(),
         name="formative_assessment_dashboard"),
    path("formative-assessments/<slug:slug>/",
         FormativeAssessmentDetailView.as_view(), name="formative_assessment_detail"),
]
