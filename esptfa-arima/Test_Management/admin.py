from django.contrib import admin

# Register your models here.
from .models import Section, Student, AnalysisDocument, FormativeAssessmentScore, PredictedScore

admin.site.register(Section)
admin.site.register(Student)
admin.site.register(AnalysisDocument)
admin.site.register(FormativeAssessmentScore)
admin.site.register(PredictedScore)
