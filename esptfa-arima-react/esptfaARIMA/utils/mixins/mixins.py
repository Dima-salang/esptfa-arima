from django.core.exceptions import PermissionDenied
from django.contrib import messages
from django.shortcuts import redirect

class TeacherRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.groups.filter(name="Teachers").exists():
            messages.error(request, "You are not authorized to access this page.")
            return redirect("home")
        return super().dispatch(request, *args, **kwargs)
