

# permissions for checking if user is a teacher
from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return request.user.is_authenticated and getattr(request.user, 'teacher', None) is not None
