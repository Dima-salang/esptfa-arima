from rest_framework import serializers
from .models import *
from Authentication.models import Teacher
from django.core.exceptions import ObjectDoesNotExist


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class QuarterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quarter
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'


class TestDraftSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    quarter = QuarterSerializer(read_only=True)
    section_id = SectionSerializer(read_only=True)

    class Meta:
        model = TestDraft
        fields = '__all__'


class IdempotencyKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = IdempotencyKey
        fields = '__all__'


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class AnalysisDocumentSerializer(serializers.ModelSerializer):
    quarter = QuarterSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    section_id = SectionSerializer(source='section', read_only=True)

    class Meta:
        model = AnalysisDocument
        fields = '__all__'


class FormativeAssessmentScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormativeAssessmentScore
        fields = '__all__'
    


class PredictedScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictedScore
        fields = '__all__'


class TestTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestTopic
        fields = '__all__'


class TestTopicMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestTopicMapping
        fields = '__all__'


class AnalysisDocumentStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisDocumentStatistic
        fields = '__all__'


class AnalysisDocumentInsightsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisDocumentInsights
        fields = '__all__'


class FormativeAssessmentStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormativeAssessmentStatistic
        fields = '__all__'


class StudentScoresStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentScoresStatistic
        fields = '__all__'
