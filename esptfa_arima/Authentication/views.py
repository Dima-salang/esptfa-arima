
# Create your views here.
from django.http import HttpResponse
from django.contrib.auth import logout
from django.shortcuts import render, redirect
from django.contrib.auth import login
from Authentication.forms import UserRegisterForm
from django.contrib import messages
from Authentication.serializers import UserSerializer
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from Authentication.services import register_user


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
