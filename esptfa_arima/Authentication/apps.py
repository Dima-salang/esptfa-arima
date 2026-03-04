from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "Authentication"

    def ready(self):
        import os
        import logging
        from django.conf import settings

        logger = logging.getLogger(__name__)

        try:
            from django.contrib.auth.models import User

            # Check if any superuser exists
            if not User.objects.filter(is_superuser=True).exists():
                # Securely get credentials from env with fallbacks
                username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
                email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
                password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")

                User.objects.create_superuser(
                    username=username, email=email, password=password
                )
                logger.info(
                    f"No administrators found. Default superuser '{username}' created."
                )

                # Optional: Create a flag file for other one-time setup tasks
                flag_file = os.path.join(settings.BASE_DIR, ".initialized")
                if not os.path.exists(flag_file):
                    with open(flag_file, "w") as f:
                        f.write("Initialized")
        except Exception:
            # If the database tables are not yet created (e.g. during first migrate),
            # this will fail silently and try again on the next start.
            logger.debug("Database not ready yet, skipping admin auto-creation.")
            pass
