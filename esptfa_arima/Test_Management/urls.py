from django.urls import path
from .views import upload_analysis_document, home, FormativeAssessmentDashboardView, FormativeAssessmentDetailView,IndividualFADetailView, IndividualStudentDetailView, delete_document, delete_document_ajax
from rest_framework.routers import DefaultRouter
from .views import *

urlpatterns = [
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
router.register(r'analysis-document-statistic', AnalysisDocumentStatisticViewSet, basename='analysis-document-statistic')
router.register(r'formative-assessment-statistic', FormativeAssessmentStatisticViewSet, basename='formative-assessment-statistic')
router.register(r'student-scores-statistic', StudentScoresStatisticViewSet, basename='student-scores-statistic')
urlpatterns += router.urls

