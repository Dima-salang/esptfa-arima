from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from Authentication.models import Teacher
from Test_Management.models import AnalysisDocument, Section, Subject, Quarter
from Test_Management.forms import AnalysisDocumentForm
from django.core.files.uploadedfile import SimpleUploadedFile
import os
from django.conf import settings


