from django.core.exceptions import PermissionDenied


class TeacherRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.groups.filter(name="Teachers").exists():
            raise PermissionDenied(
                "You are not authorized to access this page.")
        return super().dispatch(request, *args, **kwargs)
