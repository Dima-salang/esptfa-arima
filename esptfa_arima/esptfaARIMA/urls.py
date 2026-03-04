"""
URL configuration for esptfaARIMA project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf.urls.static import static
from django.conf import settings
from django.views.generic import TemplateView
import django_eventstream

urlpatterns = [
    path("admin/", admin.site.urls),
    path("events/", include(django_eventstream.urls)),
    # rest-based
    path("api/", include("Authentication.urls")),
    path("api/", include("Test_Management.urls")),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# Serve static files from the React dist directory if available
static_root = getattr(settings, "REACT_DIST_DIR", settings.STATIC_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=static_root)

# catch all for react - MUST BE LAST
# Use a negative lookahead to ignore common backend prefixes
urlpatterns += [
    re_path(
        r"^(?!admin|api|static|media|events).*$",
        TemplateView.as_view(template_name="index.html"),
    ),
]
