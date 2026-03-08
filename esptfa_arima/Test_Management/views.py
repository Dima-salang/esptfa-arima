from django.http import HttpRequest, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.forms import forms
from arima_model.tasks import process_analysis_document
from django.core.exceptions import ObjectDoesNotExist
from .forms import AnalysisDocumentForm
from django.contrib.auth.decorators import login_required
from Authentication.models import Teacher
from arima_model.arima_model import arima_driver, preprocess_data
from django.views.generic import ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Avg, Max, Min, F, ExpressionWrapper, FloatField
import logging
from django.db import transaction
from django.core.files.base import ContentFile
from utils.decorators.decorators import teacher_required
from utils.mixins.mixins import TeacherRequiredMixin
from utils.insights import get_visualization_insights, get_gemini_insights

logger = logging.getLogger("arima_model")
import pandas as pd
from rest_framework import viewsets, permissions, status, filters
from .permissions.permissions import IsTeacher
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import *
from .models import *
from .services.analysis_doc_service import (
    create_analysis_document,
    create_topic_mappings,
    create_topics,
    get_or_create_draft,
    start_arima_model,
)
from django_filters.rest_framework import DjangoFilterBackend
from enum import Enum


# enum for intervention
class InterventionEnum(Enum):
    REMEDIAL = "Remedial"
    RE_TEACHING = "Re-teaching"
    PRACTICE_ACTIVITY = "Practice Activity"
    TUTORIAL = "Tutorial"
    NA = "N/A"


class AnalysisDocumentViewSet(viewsets.ModelViewSet):
    queryset = AnalysisDocument.objects.all().order_by("-upload_date")
    serializer_class = AnalysisDocumentSerializer

    # define filtering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    # define the filters
    filterset_fields = ["subject", "quarter", "section", "status"]
    search_fields = [
        "teacher__first_name",
        "teacher__last_name",
        "subject__subject_name",
        "quarter__quarter_name",
        "section__section_name",
        "analysis_doc_title",
    ]

    ordering_fields = ["upload_date", "status"]

    def get_queryset(self):
        user = self.request.user

        # Superusers can see everything
        if user.is_superuser:
            return AnalysisDocument.objects.all().order_by("-upload_date")

        # Check if student
        if hasattr(user, "student"):
            return AnalysisDocument.objects.filter(
                section=user.student.section
            ).order_by("-upload_date")

        # Teachers see their own documents
        return AnalysisDocument.objects.filter(teacher=user).order_by("-upload_date")

    def get_permissions(self):
        # Actions allowed for both teachers and students
        if self.action in ["list", "retrieve", "student_analysis_detail"]:
            return [permissions.IsAuthenticated()]
        # Actions restricted to teachers (create, full_details, etc.)
        return [permissions.IsAuthenticated(), IsTeacher()]

    # define the create method
    def create(self, request, *args, **kwargs):
        try:
            # Get draft_id from request
            draft_id = request.data.get("test_draft_id")
            if not draft_id:
                return Response(
                    {"error": "test_draft_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch the draft object
            draft = TestDraft.objects.get(pk=draft_id)

            # call the create_analysis_document function
            document = create_analysis_document(draft)

            # Start ARIMA process
            start_arima_model(document)

            return Response(
                {
                    "message": "Analysis document created successfully",
                    "analysis_document_id": document.analysis_document_id,
                },
                status=status.HTTP_201_CREATED,
            )

        except TestDraft.DoesNotExist:
            return Response(
                {"error": "Draft not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating analysis document: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def full_details(self, request, pk=None):
        try:
            document = self.get_object()
            if not document.status:
                return Response(
                    {"message": "Document is still being processed"},
                    status=status.HTTP_202_ACCEPTED,
                )

            # 1. Base Stats
            doc_stats = AnalysisDocumentStatistic.objects.filter(
                analysis_document=document
            ).first()
            doc_stats_data = (
                AnalysisDocumentStatisticSerializer(doc_stats).data
                if doc_stats
                else None
            )

            # 2. Topic Mapping
            topics_mapping = TestTopicMapping.objects.filter(
                analysis_document=document
            ).select_related("topic")
            topics_data = []
            for tm in topics_mapping:
                topics_data.append(
                    {
                        "test_number": tm.topic.test_number,
                        "topic_name": tm.topic.topic_name,
                        "max_score": tm.topic.max_score,
                    }
                )

            # 3. Formative Assessment Statistics (Class level per test)
            fa_stats = FormativeAssessmentStatistic.objects.filter(
                analysis_document=document
            ).order_by("formative_assessment_number")
            fa_stats_data = FormativeAssessmentStatisticSerializer(
                fa_stats, many=True
            ).data

            # 4. Student Statistics, Predictions, and raw scores
            student_stats = StudentScoresStatistic.objects.filter(
                analysis_document=document
            ).select_related("student", "student__user_id")
            predictions = PredictedScore.objects.filter(
                analysis_document=document
            ).select_related("student_id")
            all_scores = FormativeAssessmentScore.objects.filter(
                analysis_document=document
            ).values("student_id__lrn", "test_number", "score", "passing_threshold")

            # Create a lookup for predictions and actual scores
            pred_lookup = {p.student_id.lrn: p for p in predictions}
            actual_lookup = {
                a.student.lrn: a
                for a in ActualPostTest.objects.filter(analysis_document=document)
            }

            # Group scores by student for the matrix
            scores_by_student = {}
            for s in all_scores:
                lrn = s["student_id__lrn"]
                if lrn not in scores_by_student:
                    scores_by_student[lrn] = {}
                scores_by_student[lrn][s["test_number"]] = s["score"]

            # Combine student stats and predictions
            student_performance = []
            for ss in student_stats:
                pred = pred_lookup.get(ss.student.lrn)
                prediction_score_percent = (
                    (pred.score / pred.max_score) * 100
                    if pred and pred.max_score
                    else 0
                )
                actual = actual_lookup.get(ss.student.lrn)
                student_performance.append(
                    {
                        "lrn": ss.student.lrn,
                        "name": ss.student.full_name,
                        "mean": ss.mean,
                        "passing_rate": ss.passing_rate,
                        "failing_rate": ss.failing_rate,
                        "predicted_score": pred.score if pred else None,
                        "predicted_status": pred.predicted_status if pred else "N/A",
                        "prediction_score_percent": prediction_score_percent,
                        "actual_score": actual.score if actual else None,
                        "actual_max": actual.max_score if actual else None,
                        "actual_status": actual.status if actual else None,
                        "prediction_intervention": self.get_intervention(
                            prediction_score_percent, "analysis_document"
                        )
                        if pred
                        else {InterventionEnum.NA.value: "No data"},
                        "actual_intervention": self.get_intervention(
                            (actual.score / actual.max_score) * 100, "analysis_document"
                        )
                        if actual and actual.max_score
                        else {InterventionEnum.NA.value: "No data"},
                        "scores": scores_by_student.get(ss.student.lrn, {}),
                        "sum_scores": ss.sum_scores,
                        "max_possible_score": ss.max_possible_score,
                    }
                )

            # 5. Insights
            insights_obj = AnalysisDocumentInsights.objects.filter(
                analysis_document=document
            ).first()
            insights_data = (
                AnalysisDocumentInsightsSerializer(insights_obj).data
                if insights_obj
                else None
            )

            return Response(
                {
                    "document": AnalysisDocumentSerializer(document).data,
                    "statistics": doc_stats_data,
                    "topics": topics_data,
                    "formative_assessments": fa_stats_data,
                    "student_performance": student_performance,
                    "insights": insights_data,
                }
            )
        except Exception as e:
            logger.error(f"Error in full_details: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def student_analysis_detail(self, request, pk=None):
        try:
            document = self.get_object()
            lrn = request.query_params.get("lrn")
            if not lrn:
                return Response(
                    {"error": "LRN is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Security: If the user is a student, they can ONLY access their own LRN
            if hasattr(request.user, "student"):
                if request.user.student.lrn != lrn:
                    return Response(
                        {
                            "error": "You do not have permission to view other students' statistics."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            student = get_object_or_404(Student, lrn=lrn)

            # Student specific stats for this doc
            ss_stats = StudentScoresStatistic.objects.filter(
                analysis_document=document, student=student
            ).first()

            # Prediction
            prediction = PredictedScore.objects.filter(
                analysis_document=document, student_id=student
            ).first()

            # Actual Post Test
            actual = ActualPostTest.objects.filter(
                analysis_document=document, student=student
            ).first()

            # Individual scores
            scores_objs = FormativeAssessmentScore.objects.filter(
                analysis_document=document, student_id=student
            ).order_by("test_number")

            # Class FA stats for comparison
            # We use the serializer we just updated for fa_topic_name
            fa_stats = FormativeAssessmentStatistic.objects.filter(
                analysis_document=document
            ).order_by("formative_assessment_number")

            # prediction score percent
            prediction_score_percent = 0
            if prediction and prediction.max_score:
                prediction_score_percent = (
                    prediction.score / prediction.max_score
                ) * 100

            # Format scores to include topic name
            scores_data = []
            for s in scores_objs:
                data = FormativeAssessmentScoreSerializer(s).data
                # Find topic name from fa_stats if possible
                topic_stat = next(
                    (
                        stat
                        for stat in fa_stats
                        if stat.formative_assessment_number == s.test_number
                    ),
                    None,
                )
                data["topic_name"] = (
                    topic_stat.fa_topic.topic_name
                    if topic_stat and topic_stat.fa_topic
                    else f"Test {s.test_number}"
                )
                scores_data.append(data)

            return Response(
                {
                    "student": {
                        "lrn": student.lrn,
                        "name": student.full_name,
                    },
                    "student_stats": StudentScoresStatisticSerializer(ss_stats).data
                    if ss_stats
                    else None,
                    "prediction": PredictedScoreSerializer(prediction).data
                    if prediction
                    else None,
                    "prediction_score_percent": prediction_score_percent,
                    "actual_post_test": ActualPostTestSerializer(actual).data
                    if actual
                    else None,
                    "prediction_intervention": self.get_intervention(
                        prediction_score_percent, "student"
                    )
                    if prediction
                    else "No intervention data available.",
                    "actual_intervention": self.get_intervention(
                        (actual.score / actual.max_score) * 100, "student"
                    )
                    if actual and actual.max_score
                    else "No actual post test data available.",
                    "scores": scores_data,
                    "class_averages": FormativeAssessmentStatisticSerializer(
                        fa_stats, many=True
                    ).data,
                    "document": AnalysisDocumentSerializer(document).data,
                }
            )
        except Exception as e:
            logger.error(f"Error in student_analysis_detail: {e}")
            return Response(
                {"error": "Failed to fetch student statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_intervention(self, prediction_score_percent, type: str):
        if prediction_score_percent is None:
            return {InterventionEnum.NA.value: "N/A"}

        # based on type, return different intervention
        if type == "analysis_document":
            if prediction_score_percent < 75:
                return {
                    InterventionEnum.REMEDIAL.value: "Intensive Intervention Required: Immediate one-on-one session and remedial materials."
                }
            elif prediction_score_percent <= 79:
                return {
                    InterventionEnum.RE_TEACHING.value: "Targeted Support: Peer tutoring and additional practice exercises on weak topics."
                }
            elif prediction_score_percent <= 89:
                return {
                    InterventionEnum.PRACTICE_ACTIVITY.value: "Regular Monitoring: Continue standard instruction with occasional check-ins."
                }
            else:
                return {
                    InterventionEnum.TUTORIAL.value: "Enrichment Activities: Provide advanced materials to further challenge the student."
                }
        # if type is student
        elif type == "student":
            if prediction_score_percent < 75:
                return {
                    InterventionEnum.REMEDIAL.value: "You need additional support to understand the lesson. Please review the basics."
                }
            elif prediction_score_percent <= 79:
                return {
                    InterventionEnum.RE_TEACHING.value: "You need further clarification of some lesson parts."
                }
            elif prediction_score_percent <= 89:
                return {
                    InterventionEnum.PRACTICE_ACTIVITY.value: "You are doing well. More practice will help you improve further."
                }
            else:
                return {
                    InterventionEnum.TUTORIAL.value: "You are performing very well. Try guided or enrichment activities to challenge you further."
                }
        return {InterventionEnum.NA.value: "N/A"}


class PredictedScoreViewSet(viewsets.ModelViewSet):
    queryset = PredictedScore.objects.all()
    serializer_class = PredictedScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = PredictedScore.objects.all()

        analysis_document_id = self.request.query_params.get(
            "analysis_document_id", None
        )
        if analysis_document_id:
            queryset = queryset.filter(analysis_document_id=analysis_document_id)

        if hasattr(user, "student"):
            return queryset.filter(student_id=user.student)
        elif not user.is_superuser:
            return queryset.filter(analysis_document__teacher=user)
        return queryset


class TestDraftViewSet(viewsets.ModelViewSet):
    queryset = TestDraft.objects.all()
    serializer_class = TestDraftSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    # filtering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    # define the filters
    filterset_fields = ["subject", "quarter", "section_id", "status"]
    search_fields = [
        "title",
        "subject__subject_name",
        "quarter__quarter_name",
        "section_id__section_name",
    ]
    ordering_fields = ["created_at", "updated_at", "status"]

    # gets or creates the draft if it doesn't exist
    # if it does not exist, the idempotency key for it also created and is returned
    def create(self, request, *args, **kwargs):
        idempotency_key = request.headers.get("Idempotency-Key")

        if not idempotency_key:
            return Response(
                {"error": "Idempotency-Key header is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve IDs to model instances
        try:
            subject_id = request.data.get("subject")
            quarter_id = request.data.get("quarter")
            section_id = request.data.get("section_id")

            subject = Subject.objects.get(pk=subject_id) if subject_id else None
            quarter = Quarter.objects.get(pk=quarter_id) if quarter_id else None
            section = Section.objects.get(pk=section_id) if section_id else None
        except ObjectDoesNotExist as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        draft = get_or_create_draft(
            idempotency_key,
            request.user,
            title=request.data.get("title"),
            quarter=quarter,
            subject=subject,
            section_id=section,
            test_content=request.data.get("test_content", {}),
            status=request.data.get("status", "draft"),
        )

        if not draft:
            return Response(
                {"error": "Internal server error retrieving or creating draft"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Update test_content if provided (for subsequent calls with same key)
        test_content = request.data.get("test_content")
        if test_content is not None:
            draft.test_content = test_content
            draft.status = request.data.get("status", draft.status)
            draft.title = request.data.get("title", draft.title)
            draft.save()

        serializer = self.get_serializer(draft)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        return TestDraft.objects.filter(user_teacher=self.request.user).order_by(
            "-created_at"
        )


class IdempotencyKeyViewSet(viewsets.ModelViewSet):
    queryset = IdempotencyKey.objects.all()
    serializer_class = IdempotencyKeySerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]


class TestTopicViewSet(viewsets.ModelViewSet):
    queryset = TestTopic.objects.all()
    serializer_class = TestTopicSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # if the user is a superuser, return all subjects
        if self.request.user.is_superuser:
            return Subject.objects.all()

        # filter by teacher assignment
        teacher_assignments = TeacherAssignment.objects.filter(
            teacher=self.request.user
        )
        return Subject.objects.filter(
            pk__in=teacher_assignments.values_list("subject_id", flat=True)
        )


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # if the user is an anonymous user, like in the instance of registration
        if not self.request.user.is_authenticated:
            return Section.objects.all()

        # if the user is a superuser, return all sections
        if self.request.user.is_superuser:
            return Section.objects.all()

        if self.request.user.is_authenticated and hasattr(self.request.user, "teacher"):
            # filter by teacher assignment
            teacher_assignments = TeacherAssignment.objects.filter(
                teacher=self.request.user
            )
            return Section.objects.filter(
                pk__in=teacher_assignments.values_list("section_id", flat=True)
            )

        # Return all sections for students or anonymous users
        return Section.objects.all()


class QuarterViewSet(viewsets.ModelViewSet):
    queryset = Quarter.objects.all()
    serializer_class = QuarterSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TeacherAssignment.objects.all()
    serializer_class = TeacherAssignmentSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        # if the user is a superuser, return all teacher assignments
        if self.request.user.is_superuser:
            return TeacherAssignment.objects.all()

        # filter by teacher assignment
        return TeacherAssignment.objects.filter(teacher=self.request.user)


class AnalysisDocumentStatisticViewSet(viewsets.ModelViewSet):
    serializer_class = AnalysisDocumentStatisticSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # get the analysis document id from the request
        analysis_document_id = self.request.query_params.get(
            "analysis_document_id", None
        )
        return AnalysisDocumentStatistic.objects.filter(
            analysis_document_id=analysis_document_id
        )


class FormativeAssessmentStatisticViewSet(viewsets.ModelViewSet):
    serializer_class = FormativeAssessmentStatisticSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # get the analysis document id from the request
        analysis_document_id = self.request.query_params.get(
            "analysis_document_id", None
        )
        return FormativeAssessmentStatistic.objects.filter(
            analysis_document_id=analysis_document_id
        )


class StudentScoresStatisticViewSet(viewsets.ModelViewSet):
    serializer_class = StudentScoresStatisticSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = StudentScoresStatistic.objects.all()

        analysis_document_id = self.request.query_params.get(
            "analysis_document_id", None
        )
        if analysis_document_id:
            queryset = queryset.filter(analysis_document_id=analysis_document_id)

        if hasattr(user, "student"):
            return queryset.filter(student=user.student)
        elif not user.is_superuser:
            return queryset.filter(analysis_document__teacher=user)
        return queryset


class ActualPostTestViewSet(viewsets.ModelViewSet):
    queryset = ActualPostTest.objects.all()
    serializer_class = ActualPostTestSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        # Filter by analysis document if provided
        analysis_document_id = self.request.query_params.get(
            "analysis_document_id", None
        )
        if analysis_document_id:
            return ActualPostTest.objects.filter(
                analysis_document_id=analysis_document_id
            )
        return ActualPostTest.objects.all()

    @action(detail=False, methods=["post"])
    def bulk_upload(self, request):
        analysis_document_id = request.data.get("analysis_document_id")
        scores = request.data.get(
            "scores", []
        )  # List of {lrn: ..., score: ..., max_score: ...}

        if not analysis_document_id:
            return Response(
                {"error": "analysis_document_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = AnalysisDocument.objects.get(pk=analysis_document_id)

            created_objects = []
            with transaction.atomic():
                # Delete existing actual scores for this doc if any?
                # Or just update? Let's update or create.
                for score_item in scores:
                    lrn = score_item.get("lrn")
                    score = score_item.get("score")
                    max_score = document.post_test_max_score or 1

                    student = Student.objects.get(lrn=lrn)

                    status_val = "Pass" if score >= (max_score * 0.75) else "Fail"

                    obj, created = ActualPostTest.objects.update_or_create(
                        analysis_document=document,
                        student=student,
                        defaults={
                            "score": score,
                            "max_score": max_score,
                            "status": status_val,
                        },
                    )
                    created_objects.append(obj)

            return Response(
                {"message": f"Successfully uploaded {len(created_objects)} scores"},
                status=status.HTTP_201_CREATED,
            )
        except AnalysisDocument.DoesNotExist:
            return Response(
                {"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Student.DoesNotExist as e:
            return Response(
                {"error": f"Student not found: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class AnalysisGroupViewSet(viewsets.ModelViewSet):
    queryset = AnalysisGroup.objects.all().order_by("-created_at")
    serializer_class = AnalysisGroupSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["group_name"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return AnalysisGroup.objects.all().order_by("-created_at")
        return AnalysisGroup.objects.filter(teacher=self.request.user).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=["get"])
    def details(self, request, pk=None):
        try:
            group = self.get_object()
            serializer = AnalysisGroupDetailSerializer(group)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
