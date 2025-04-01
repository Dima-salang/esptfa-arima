import os
from celery import Celery

# Set default Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "esptfaARIMA.settings")

celery_app = Celery("esptfaARIMA")

# Load config from settings.py
celery_app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in apps
celery_app.autodiscover_tasks()


# Setup logging
celery_app.conf.update(
    task_send_sent_event=True,  # Enable task events
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(taskName)s] %(message)s',
)


@celery_app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
