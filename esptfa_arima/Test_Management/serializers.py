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


class TeacherUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'name']
    
    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    teacher_details = TeacherUserSerializer(source='teacher', read_only=True)
    subject_details = SubjectSerializer(source='subject', read_only=True)
    section_details = SectionSerializer(source='section', read_only=True)

    class Meta:
        model = TeacherAssignment
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
    formative_assessment_number = serializers.ReadOnlyField(source='test_number')
    max_score = serializers.SerializerMethodField()

    class Meta:
        model = FormativeAssessmentScore
        fields = '__all__'
    
    def get_max_score(self, obj):
        if obj.topic_mapping and obj.topic_mapping.topic:
            return obj.topic_mapping.topic.max_score
        # Fallback to calculating from passing_threshold if topic_mapping is missing
        if obj.passing_threshold:
            return obj.passing_threshold / 0.75
        return 0
    


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
    id = serializers.ReadOnlyField(source='formative_assessment_statistic_id')
    fa_topic_name = serializers.ReadOnlyField(source='fa_topic.topic_name')

    class Meta:
        model = FormativeAssessmentStatistic
        fields = '__all__'


class StudentScoresStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentScoresStatistic
        fields = '__all__'


class ActualPostTestSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')

    class Meta:
        model = ActualPostTest
        fields = '__all__'
