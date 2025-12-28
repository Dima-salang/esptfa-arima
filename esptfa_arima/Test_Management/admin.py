from django.contrib import admin

# Register your models here.
from .models import *

admin.site.register(Section)
admin.site.register(AnalysisDocument)
admin.site.register(FormativeAssessmentScore)
admin.site.register(PredictedScore)
admin.site.register(AnalysisDocumentStatistic)
admin.site.register(FormativeAssessmentStatistic)
admin.site.register(StudentScoresStatistic)
admin.site.register(Subject)
admin.site.register(Quarter)
admin.site.register(TestTopicMapping)
admin.site.register(TestTopic)
admin.site.register(TestDraft)
admin.site.register(IdempotencyKey)
