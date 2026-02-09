from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "Authentication"

    def ready(self):
        import os
        from django.conf import settings

        # Define a flag file path to track initialization
        flag_file = os.path.join(settings.BASE_DIR, ".initialized")

        if not os.path.exists(flag_file):
            try:
                from django.contrib.auth.models import User

                # Securely get credentials from env with fallbacks
                username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
                email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
                password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")

                # Check if we can access the DB and if users table exists
                if not User.objects.filter(username=username).exists():
                    User.objects.create_superuser(username, email, password)
                    print(f"Default superuser '{username}' created.")

                # Create the flag file to mark initialization as complete
                with open(flag_file, "w") as f:
                    f.write("Initialized")

            except Exception:
                # If the database or table is not ready, we simply skip.
                # The flag file is NOT created, so it will try again next time.
                pass
