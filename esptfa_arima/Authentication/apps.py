from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_default_superuser(sender, **kwargs):
    from django.contrib.auth.models import User

    try:
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@example.com", "admin")
            print("Default superuser 'admin' created with password 'admin'.")
    except Exception:
        # This can happen during initial migrations or if the database is not yet ready
        pass


class AuthenticationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "Authentication"

    def ready(self):
        # Using post_migrate signal to ensure database tables are created first
        post_migrate.connect(create_default_superuser, sender=self)
