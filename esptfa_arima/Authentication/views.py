
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


from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class LoginViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny] # Ensure anyone can try to login

    def create(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        # Use Django's built-in authenticate
        user = authenticate(username=username, password=password)
        
        if user is not None:
            if user.is_active:
                refresh = RefreshToken.for_user(user)
                # Use your existing serializer for the user data
                from .serializers import UserSerializer 
                user_data = UserSerializer(user).data
                
                return Response({
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": user_data
                }, status=status.HTTP_200_OK)
            return Response({"detail": "Account disabled"}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # register the user
        register_user(
            serializer.validated_data.get("username"),
            serializer.validated_data.get("password"),
            serializer.validated_data.get("first_name"),
            serializer.validated_data.get("last_name"),
            serializer.validated_data.get("email"),
            serializer.validated_data.get("acc_type"),
            serializer.validated_data.get("lrn"),
            serializer.validated_data.get("section")
        )

        return Response({"message": "Your account has been created successfully. Please wait for approval from the administrator."}, status=status.HTTP_201_CREATED)

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]

    from rest_framework.decorators import action
    @action(detail=False, methods=['get'])
    def me(self, request):
        teacher = Teacher.objects.filter(user_id=request.user).first()
        if not teacher:
            return Response({"detail": "Teacher profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(teacher)
        return Response(serializer.data)


class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StudentViewSet(ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    # define the permissions
    permission_classes = [permissions.IsAuthenticated]