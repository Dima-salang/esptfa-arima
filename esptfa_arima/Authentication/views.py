
# Create your views here.
from django.http import HttpResponse
from django.contrib.auth import logout
from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import UserRegisterForm
from django.contrib import messages
from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import Teacher, Student
from .serializers import UserSerializer, TeacherSerializer, StudentSerializer
from .services import register_user, login_user


def register(request):
    if request.method == "POST":
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False
            user.save()  # Save the new user
            messages.success(request, "Your account has been created successfully. Please wait for approval from the administrator.")
            return redirect("home")
        else:
             messages.error(request, "Invalid form submission, try checking all fields again.")
    else:
        form = UserRegisterForm()

    return render(request, "registration/register.html", {"form": form})


class LoginViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = login_user(username, password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            }, status=status.HTTP_200_OK)
        
        return Response({"error": "Invalid credentials or account not active."}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # register the user
        register_user(request.data["username"],
            request.data["password"],
            request.data["first_name"],
            request.data["last_name"],
            request.data["email"],
            request.data["acc_type"],
            request.data["lrn"])

        return Response({"message": "Your account has been created successfully. Please wait for approval from the administrator."}, status=status.HTTP_201_CREATED)

class TeacherViewSet(ModelViewSet):
    
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]


class StudentViewSet(ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]