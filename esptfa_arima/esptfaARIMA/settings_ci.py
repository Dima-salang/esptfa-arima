from pathlib import Path
import os
from dotenv import load_dotenv
import sentry_sdk
from datetime import timedelta, datetime


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, ".env"))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# ASGI
ASGI_APPLICATION = "esptfaARIMA.asgi.application"


# CORS
# we allow all for now since we are in testing
CORS_ALLOW_ALL_ORIGINS = True

# CORS headers
# we allow the idempotency key for test drafting
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'idempotency-key',
]


# DJANGO EVENTSTREAM
EVENTSTREAM_REDIS = {
    'host': 'redis',
    'port': 6379,
    'db': 0,
}

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["*"]

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True, # Good for security
    'BLACKLIST_AFTER_ROTATION': True, # Requires 'rest_framework_simplejwt.token_blacklist' in INSTALLED_APPS
}

LOGIN_URL = "/auth/login/"
LOGIN_REDIRECT_URL = "/formative-assessments/"
LOGOUT_REDIRECT_URL = "/auth/login/"


MEDIA_URL = "/media/"
# Media files will be stored in the "media" folder
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# CELERY CONFIG
# Redis as message broker
CELERY_BROKER_URL = "redis://redis:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django_eventstream',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    
    # mine
    'arima_model',
    'Test_Management',
    'Authentication',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'esptfaARIMA.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'esptfaARIMA.wsgi.application'


# REST
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    "DEFAULT_PAGINATION_CLASS":
        "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10
}

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # 'django.db.backends.postgresql',
        'NAME':  'esptfa_arima',
        #'USER': 'postgres',
        #'PASSWORD': 'test',
        #'HOST': 'db',
        #'PORT': '5432',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} | {levelname} | {module} | {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} | {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(BASE_DIR, "logs/django/django_logs.log"),
            "maxBytes": 1024 * 1024 * 5,  # 5 MB
            "backupCount": 3,
            "delay": True,
            "formatter": "verbose",
        },
        "file_INFO": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(BASE_DIR, "logs/django/django_info_logs.log"),
            "maxBytes": 1024 * 1024 * 5,  # 5 MB
            "backupCount": 2,
            "delay": True,
            "formatter": "verbose",
        },
        "file_arima_model": {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(BASE_DIR, "logs/arima/arima_model_logs.log"),
            "formatter": "verbose",
            "delay": True,
            "maxBytes": 1024 * 1024 * 5,  # 5 MB
            "backupCount": 2,
        },
    },
    "loggers": {
        "django": {
            "handlers": ["file_INFO"],
            "level": "DEBUG",
            "propagate": True,
        },
        "django.request": {
            "level": "ERROR",
            "handlers": ["console", "file_INFO"],
            "propagate": False,
        }, "arima_model": {
            "handlers": ["console", "file_arima_model"],
            "level": "DEBUG",
            "propagate": True,
        }
    },
}



# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
