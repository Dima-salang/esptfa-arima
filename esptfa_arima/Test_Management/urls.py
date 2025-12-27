from django.urls import path
from .views import upload_analysis_document, home, FormativeAssessmentDashboardView, FormativeAssessmentDetailView,IndividualFADetailView, IndividualStudentDetailView, delete_document, delete_document_ajax
from rest_framework.routers import DefaultRouter
from .views import AnalysisDocumentViewSet, TestDraftViewSet, IdempotencyKeyViewSet, TestTopicViewSet, SubjectViewSet, SectionViewSet, QuarterViewSet

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

# router for test management
router = DefaultRouter()
router.register(r'analysis-document', AnalysisDocumentViewSet, basename='analysis-document')
router.register(r'test-draft', TestDraftViewSet, basename='test-draft')
router.register(r'idempotency-key', IdempotencyKeyViewSet, basename='idempotency-key')
router.register(r'test-topic', TestTopicViewSet, basename='test-topic')
router.register(r'subject', SubjectViewSet, basename='subject')
router.register(r'section', SectionViewSet, basename='section')
router.register(r'quarter', QuarterViewSet, basename='quarter')
urlpatterns += router.urls

