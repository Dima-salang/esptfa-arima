
# Create your views here.
from django.http import HttpResponse
from django.contrib.auth import logout
from django.shortcuts import render, redirect
from django.contrib.auth import login
from Authentication.forms import UserRegisterForm


def register(request):
    if request.method == "POST":
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False
            user.save()  # Save the new user
            return redirect("home")  # Redirect to home or dashboard
    else:
        form = UserRegisterForm()

    return render(request, "registration/register.html", {"form": form})
