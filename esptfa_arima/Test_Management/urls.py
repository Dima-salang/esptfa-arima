from django.urls import path
from .views import upload_analysis_document, home, FormativeAssessmentDashboardView, FormativeAssessmentDetailView,IndividualFADetailView, IndividualStudentDetailView, delete_document, delete_document_ajax
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("", home, name="home"),
    path("upload-document/", upload_analysis_document, name="upload_document"),
    path("formative-assessments/", FormativeAssessmentDashboardView.as_view(),
         name="formative_assessment_dashboard"),
    path("formative-assessments/<int:document_pk>/",
         FormativeAssessmentDetailView.as_view(), name="formative_assessment_detail"),
     path("formative-assessments/<int:document_pk>/test/<int:fa_pk>/", IndividualFADetailView.as_view(), name='individual_fa_detail'),
     path("formative-assessments/<int:document_pk>/student/<int:student_pk>/", IndividualStudentDetailView.as_view(), name='individual_student_detail'),
     path("formative-assessments/<int:document_pk>/delete/", delete_document, name="delete_document"),
     path("api/formative-assessments/<int:document_pk>/delete/", delete_document_ajax, name="delete_document_ajax"),
]
