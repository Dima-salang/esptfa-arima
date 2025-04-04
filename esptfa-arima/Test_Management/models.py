from django.db import models
from django.contrib.auth.models import User
from Authentication.models import Teacher
# Create your models here.




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

class Student(models.Model):
    student_id = models.CharField(unique=True, primary_key=True, max_length=20)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    section = models.CharField(max_length=100, null=True)


    def __str__(self):
        return f"{self.first_name} {self.last_name}({self.student_id})"



class AnalysisDocument(models.Model):
    analysis_document_id = models.AutoField(unique=True, primary_key=True)
    analysis_doc_title = models.CharField(max_length=100)
    quarter = models.ForeignKey(Quarter, on_delete=models.CASCADE, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    test_start_date = models.DateField(null=True)
    analysis_doc = models.FileField(upload_to='analysis_documents/')
    teacher_id = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)

    def __str__(self):
        return self.analysis_doc_title






class FormativeAssessmentScore(models.Model):
    formative_assessment_score_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(AnalysisDocument, on_delete=models.CASCADE, null=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.student_id} - {self.formative_assessment_number}: {self.score}"


class PredictedScore(models.Model):
    predicted_score_id = models.AutoField(unique=True, primary_key=True)
    analysis_document = models.ForeignKey(AnalysisDocument, on_delete=models.CASCADE, null=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.student_id} - {self.formative_assessment_number}: {self.score}"


class TestTopic(models.Model):
    topic_id = models.AutoField(unique=True, primary_key=True)
    topic_name = models.CharField(max_length=100)

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
    test_number = models.CharField(max_length=5)
    topic = models.ForeignKey(TestTopic, on_delete=models.CASCADE)

    class Meta:
        # Ensure each test number has only one topic per document
        unique_together = ('analysis_document', 'test_number')

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} - Test {self.test_number}: {self.topic}"


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

    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} Statistics"


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
    mode = models.FloatField()
    passing_rate = models.FloatField()
    failing_rate = models.FloatField()

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
    mode = models.FloatField()
    passing_rate = models.FloatField()
    failing_rate = models.FloatField()


    def __str__(self):
        return f"{self.analysis_document.analysis_doc_title} Statistics"