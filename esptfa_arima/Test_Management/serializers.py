from rest_framework import serializers
from .models import *
from ..Authentication.models import Teacher
from django.core.exceptions import ObjectDoesNotExist


class TestDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestDraft
        fields = '__all__'


class IdempotencyKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = IdempotencyKey
        fields = '__all__'


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


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class AnalysisDocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = AnalysisDocument
        fields = '__all__'

    def create(self, validated_data):
        # validate whether the user is a teacher
        try:
            teacher = Teacher.objects.get(user_id=self.context['request'].user)
        except ObjectDoesNotExist:
            raise serializers.ValidationError("You are not assigned as a teacher.")
        
        # create the analysis document
        analysis_document = AnalysisDocument.objects.create(**validated_data)
        analysis_document.teacher_id = teacher
        analysis_document.save()
        
        return analysis_document


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

