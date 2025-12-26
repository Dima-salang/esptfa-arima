# utils/decorators.py

from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.models import Group
from django.core.exceptions import PermissionDenied


def teacher_required(view_func):
    def check_teacher(user):
        if not user.is_authenticated:
            return False
        if not user.groups.filter(name="Teachers").exists():
            raise PermissionDenied(
                "You are not authorized to access this page.")
        return True
    return user_passes_test(check_teacher)(view_func)
