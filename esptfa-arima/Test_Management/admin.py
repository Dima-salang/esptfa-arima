from django.contrib import admin

# Register your models here.
from .models import Section, Student, AnalysisDocument, FormativeAssessmentScore, PredictedScore,Subject, Quarter, TestTopicMapping, TestTopic

admin.site.register(Section)
admin.site.register(Student)
admin.site.register(AnalysisDocument)
admin.site.register(FormativeAssessmentScore)
admin.site.register(PredictedScore)
admin.site.register(Subject)
admin.site.register(Quarter)
admin.site.register(TestTopicMapping)
admin.site.register(TestTopic)
