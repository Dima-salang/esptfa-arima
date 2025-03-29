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
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.first_name} {self.last_name}({self.student_id})"



class AnalysisDocument(models.Model):
    analysis_document_id = models.AutoField(unique=True, primary_key=True)
    analysis_doc_title = models.CharField(max_length=100)
    quarter = models.ForeignKey(Quarter, on_delete=models.CASCADE, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    analysis_doc = models.FileField(upload_to='analysis_documents/')
    teacher_id = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)

    def __str__(self):
        return self.analysis_doc_title

class FormativeAssessmentScore(models.Model):
    formative_assessment_score_id = models.AutoField(unique=True, primary_key=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.student_id} - {self.formative_assessment_number}: {self.score}"


class PredictedScore(models.Model):
    predicted_score_id = models.AutoField(unique=True, primary_key=True)
    formative_assessment_score_id = models.ForeignKey(FormativeAssessmentScore, on_delete=models.CASCADE)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.student_id} - {self.formative_assessment_number}: {self.score}"
