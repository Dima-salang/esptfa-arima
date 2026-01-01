

# permissions for checking if user is a teacher
from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.teacher is not None


class HasTeacherAssignment(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.teacher is not None