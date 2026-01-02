from django.db import models
from django.contrib.auth.models import User
from Authentication.models import Student
import uuid
# Create your models here.




class IdempotencyKey(models.Model):
    idempotency_key = models.UUIDField(unique=True, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    returned_draft_key = models.UUIDField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Subject(models.Model):
    subject_id = models.AutoField(unique=True, primary_key=True)
    subject_name = models.CharField(max_length=100)

    def __str__(self):
        return self.subject_name

class Quarter(models.Model):
    quarter_id = models.AutoField(unique=True, primary_key=True)
    quarter_name = models.CharField(max_length=20)

    def __str__(self):
        return self.quarter_name

class Section(models.Model):
    section_id = models.AutoField(unique=True, primary_key=True)
    section_name = models.CharField(max_length=100)

    def __str__(self):
        return self.section_name


# pairs the teacher for a specific subject and section
class TeacherAssignment(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.teacher} - {self.section} - {self.subject}"

# draft version of the analysis document
class TestDraft(models.Model):
    user_teacher = models.ForeignKey(User, on_delete=models.CASCADE)
    test_draft_id = models.UUIDField(unique=True, primary_key=True, default=uuid.uuid4)
    title = models.CharField(max_length=100)
    quarter = models.ForeignKey(Quarter, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    test_content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, default='draft')

    def __str__(self):
        return f"{self.title} - {self.test_draft_id}"

class AnalysisDocument(models.Model):
    analysis_document_id = models.AutoField(unique=True, primary_key=True)
    analysis_doc_title = models.CharField(max_length=100)
    quarter = models.ForeignKey(Quarter, on_delete=models.CASCADE, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    test_start_date = models.DateField(null=True)

    # max score of the post_test
    post_test_max_score = models.FloatField(null=True)

    # ignore the analysis_doc field for now since it is not used
    analysis_doc = models.FileField(upload_to='analysis_documents/', null=True)

    teacher = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    status = models.BooleanField(default=False)  # True if processed, False if not
    def __str__(self):
        return self.analysis_doc_title

class TestTopic(models.Model):
    topic_id = models.AutoField(unique=True, primary_key=True)
    topic_name = models.CharField(max_length=100)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)
    max_score = models.FloatField(null=True, blank=True)
    test_number = models.CharField(max_length=5, null=True, blank=True)


    def __str__(self):
        return self.topic_name

    @classmethod
    def get_or_create_topic(cls, topic_name):
        """Get existing topic or create a new one (handles duplicates)"""
        topic_name = topic_name.strip()
        try:
            return cls.objects.get(topic_name__iexact=topic_name)
        except cls.DoesNotExist:
            return cls.objects.create(topic_name=topic_name)


class TestTopicMapping(models.Model):
    """Maps test numbers to topics for a specific analysis document"""
    mapping_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(
        AnalysisDocument, on_delete=models.CASCADE, related_name='test_topics')
    topic = models.ForeignKey(TestTopic, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} - Test {self.topic.test_number}: {self.topic}"


class FormativeAssessmentScore(models.Model):
    formative_assessment_score_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(AnalysisDocument, on_delete=models.CASCADE, null=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    test_number = models.CharField(max_length=5)
    topic_mapping = models.ForeignKey(TestTopicMapping, on_delete=models.SET_NULL, null=True, blank=True)
    passing_threshold = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.student_id} - {self.test_number}: {self.score}"


class PredictedScore(models.Model):
    predicted_score_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(AnalysisDocument, on_delete=models.CASCADE, null=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    test_number = models.CharField(max_length=5)
    predicted_status = models.CharField(max_length=20, null=True, blank=True)
    passing_threshold = models.FloatField()
    max_score = models.FloatField(null=True)


    def __str__(self):
        return f"{self.student_id} - {self.test_number}: {self.score}"




class AnalysisDocumentStatistic(models.Model):
    analysis_document_statistic_id = models.AutoField(
        unique=True, primary_key=True)
    analysis_document = models.ForeignKey(
        AnalysisDocument, on_delete=models.CASCADE)
    mean = models.FloatField()
    standard_deviation = models.FloatField()
    median = models.FloatField()
    minimum = models.FloatField()
    maximum = models.FloatField()
    mode = models.FloatField()
    total_students = models.IntegerField()
    mean_passing_threshold = models.FloatField()
    heatmap = models.FileField(upload_to='heatmaps/', null=True)

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} Statistics"

class AnalysisDocumentInsights(models.Model):
    analysis_document_insights_id = models.AutoField(
        unique=True, primary_key=True)
    analysis_document = models.ForeignKey(
        AnalysisDocument, on_delete=models.CASCADE)
    insights = models.JSONField(null=True)
    ai_insights = models.JSONField(null=True)

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} Insights"

class FormativeAssessmentStatistic(models.Model):
    formative_assessment_statistic_id = models.AutoField(
        unique=True, primary_key=True)
    formative_assessment_number = models.CharField(max_length=5)
    analysis_document = models.ForeignKey(
        AnalysisDocument, on_delete=models.CASCADE)
    fa_topic = models.ForeignKey(TestTopic, on_delete=models.CASCADE, null=True)
    mean = models.FloatField()
    standard_deviation = models.FloatField()
    median = models.FloatField()
    minimum = models.FloatField()
    maximum = models.FloatField()
    mode = models.FloatField(null=True)
    passing_rate = models.FloatField()
    failing_rate = models.FloatField()
    passing_threshold = models.FloatField()
    max_score = models.FloatField(null=True)
    histogram = models.FileField(upload_to='histograms/', null=True)
    scatterplot = models.FileField(upload_to='scatterplots/', null=True)
    bar_chart = models.FileField(upload_to='bar_charts/', null=True)
    boxplot = models.FileField(upload_to='boxplots/', null=True)
    student_comparison_chart = models.FileField(upload_to='student_comparison_charts/', null=True)

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} - FA {self.formative_assessment_number} Statistics"


class StudentScoresStatistic(models.Model):
    student_scores_statistic_id = models.AutoField(
        unique=True, primary_key=True)
    analysis_document = models.ForeignKey(
        AnalysisDocument, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    mean = models.FloatField()
    standard_deviation = models.FloatField()
    median = models.FloatField()
    minimum = models.FloatField()
    maximum = models.FloatField()
    mode = models.FloatField(null=True)
    passing_rate = models.FloatField()
    failing_rate = models.FloatField()
    lineplot = models.FileField(upload_to='lineplots/', null=True)
    heatmap = models.FileField(upload_to='heatmaps/', null=True)
    performance_comparison_chart = models.FileField(upload_to='performance_comparisons/', null=True)

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} - {self.student.lrn} Statistics"


class ActualPostTest(models.Model):
    actual_post_test_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(AnalysisDocument, on_delete=models.CASCADE, related_name='actual_post_tests')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    max_score = models.FloatField()

    def __str__(self):
        return f"{self.student.full_name} - Actual Post Test: {self.score}/{self.max_score} - {self.analysis_document.analysis_doc_title}"

    # enforce unique constraint on analysis_document and student
    class Meta:
        unique_together = ('analysis_document', 'student')
