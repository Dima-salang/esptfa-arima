import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.shortcuts import redirect, render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from Test_Management.models import AnalysisDocument, Section, Subject
from Test_Management.permissions.permissions import IsTeacher

from .forms import UserRegisterForm
from .models import Student, Teacher
from .permissions import IsAdminUser
from .serializers import (
    AdminUserSerializer,
    StudentSerializer,
    TeacherSerializer,
    UserSerializer,
)
from .services import (
    process_csv_import,
    process_manual_import,
    register_user,
)

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active", "is_superuser"]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "email", "date_joined", "last_login"]


def register(request):
    if request.method == "POST":
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False
            user.save()  # Save the new user
            messages.success(
                request,
                "Your account has been created successfully. Please wait for approval from the administrator.",
            )
            return redirect("home")
        else:
            messages.error(
                request, "Invalid form submission, try checking all fields again."
            )
    else:
        form = UserRegisterForm()

    return render(request, "registration/register.html", {"form": form})


@method_decorator(csrf_exempt, name="dispatch")
class LoginViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable global authentication (like SessionAuthentication) for this endpoint

    def create(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        logger.info(f"Login attempt for user: {username}")

        # Use Django's built-in authenticate with request context
        user = authenticate(request, username=username, password=password)

        if user is None:
            # Check if the user exists but is inactive (Django's authenticate often returns None for inactive users)
            try:
                temp_user = User.objects.get(username=username)
                if temp_user.check_password(password):
                    if not temp_user.is_active:
                        logger.warning(
                            f"Login failed: user {username} is pending approval."
                        )
                        return Response(
                            {
                                "detail": "Your account is pending administrator approval."
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
            except User.DoesNotExist:
                pass

            logger.warning(f"Login failed: invalid credentials for user {username}")
            return Response(
                {"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        if user.is_active:
            try:
                refresh = RefreshToken.for_user(user)
                from .serializers import UserSerializer

                user_data = UserSerializer(user).data
                logger.info(f"User {username} logged in successfully.")

                response = Response({"user": user_data}, status=status.HTTP_200_OK)

                # Set cookies
                response.set_cookie(
                    key=settings.SIMPLE_JWT["AUTH_COOKIE"],
                    value=str(refresh.access_token),
                    max_age=settings.SIMPLE_JWT[
                        "ACCESS_TOKEN_LIFETIME"
                    ].total_seconds(),
                    secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                    httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                    samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                    path="/",
                )
                response.set_cookie(
                    key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"],
                    value=str(refresh),
                    max_age=settings.SIMPLE_JWT[
                        "REFRESH_TOKEN_LIFETIME"
                    ].total_seconds(),
                    secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                    httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                    samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                    path="/",
                )
                return response
            except Exception as e:
                logger.error(f"Token creation error for user {username}: {str(e)}")
                return Response(
                    {"detail": f"Token creation error: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        logger.warning(f"Login failed: user {username} account is disabled.")
        return Response(
            {"detail": "Your account is disabled."}, status=status.HTTP_403_FORBIDDEN
        )


@method_decorator(csrf_exempt, name="dispatch")
class RegisterViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    # Removed class-level authentication_classes override to use global ones

    @action(
        detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated]
    )
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # register the user
            register_user(
                serializer.validated_data.get("username"),
                serializer.validated_data.get("password"),
                serializer.validated_data.get("first_name"),
                serializer.validated_data.get("middle_name"),
                serializer.validated_data.get("last_name"),
                serializer.validated_data.get("email"),
                serializer.validated_data.get("acc_type"),
                serializer.validated_data.get("lrn"),
                serializer.validated_data.get("section"),
            )
        except ValidationError as e:
            # Propagate Django validation errors as DRF validation errors
            from rest_framework.exceptions import ValidationError as DRFValidationError

            raise DRFValidationError(detail=e.messages)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Your account has been created successfully. Please wait for approval from the administrator."
            },
            status=status.HTTP_201_CREATED,
        )


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        teacher = Teacher.objects.filter(user_id=request.user).first()
        if not teacher:
            return Response(
                {"detail": "Teacher profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(teacher)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name="dispatch")
class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Allow calling logout even if token is expired

    def create(self, request):
        try:
            logger.info(f"Logout attempt for user: {request.user}")
            refresh_token = request.COOKIES.get(
                settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"]
            )
            if refresh_token:
                logger.debug("Blacklisting refresh token in logout.")
                token = RefreshToken(refresh_token)
                token.blacklist()

            response = Response(
                {"detail": "Successfully logged out"}, status=status.HTTP_200_OK
            )
            response.delete_cookie(settings.SIMPLE_JWT["AUTH_COOKIE"], path="/")
            response.delete_cookie(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"], path="/")
            logger.info(f"User {request.user} logged out successfully.")
            return response
        except Exception as e:
            logger.error(f"Logout error for user {request.user}: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SystemStatsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def list(self, request):
        return Response(
            {
                "total_students": Student.objects.count(),
                "total_teachers": Teacher.objects.count(),
                "total_sections": Section.objects.count(),
                "total_subjects": Subject.objects.count(),
                "total_documents": AnalysisDocument.objects.count(),
            }
        )


class StudentViewSet(ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    # func for getting students for a specific section
    @action(detail=False, methods=["get"], permission_classes=[IsTeacher])
    def students_for_section(self, request):
        section = request.query_params.get("section")
        # validate the section
        # check whether the section parameter has been provided
        if not section:
            return Response(
                {"detail": "Section is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # check whether the section exists in the database
        try:
            section = Section.objects.get(pk=section)
        except Section.DoesNotExist:
            return Response(
                {"detail": "Section does not exist"}, status=status.HTTP_404_NOT_FOUND
            )

        students = Student.objects.filter(section=section)
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def me(self, request):
        student = Student.objects.filter(user_id=request.user).first()
        if not student:
            return Response(
                {"detail": "Student profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(student)
        return Response(serializer.data)

    # for csv convenience importing
    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def bulk_import_csv(self, request):
        # get the file from the request
        file = request.FILES["student_import_file"]

        # pass into services
        try:
            process_csv_import(file)
        except DRFValidationError as e:
            return Response(
                {"Validation Error: ": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"Error: ": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"detail": "Students imported successfully"}, status=status.HTTP_200_OK
        )

    # for manual importing
    # accepts array of students
    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def manual_import(self, request):
        # get the students from the request
        students = request.data.get("students", [])

        # pass into services
        try:
            process_manual_import(students)
        except DRFValidationError as e:
            return Response(
                {"Validation Error: ": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"Error: ": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"detail": "Students imported successfully"}, status=status.HTTP_200_OK
        )


@method_decorator(csrf_exempt, name="dispatch")
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])

        if not refresh_token:
            logger.error("Token refresh skipped: No refresh cookie found.")
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        request.data["refresh"] = refresh_token

        try:
            response = super().post(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise e

        if response.status_code == 200:
            access_token = response.data.get("access")
            refresh_token = response.data.get("refresh")

            response.set_cookie(
                key=settings.SIMPLE_JWT["AUTH_COOKIE"],
                value=access_token,
                max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
                secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                path="/",
            )
            if refresh_token:
                response.set_cookie(
                    key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"],
                    value=refresh_token,
                    max_age=settings.SIMPLE_JWT[
                        "REFRESH_TOKEN_LIFETIME"
                    ].total_seconds(),
                    secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
                    httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
                    samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
                    path="/",
                )

            # Remove tokens from response body for security
            if "access" in response.data:
                del response.data["access"]
            if "refresh" in response.data:
                del response.data["refresh"]
            logger.info("Successfully refreshed session cookies.")

        return response
