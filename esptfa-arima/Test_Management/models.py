from django.db import models
from django.contrib.auth.models import User
# Create your models here.

# student that subclasses the User model


class Section(models.Model):
    section_id = models.AutoField(unique=True, primary_key=True)
    section_name = models.CharField(max_length=100)


class Student(models.Model):
    student_id = models.CharField(unique=True, primary_key=True, max_length=20)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)


class Teacher(models.Model):
    teacher_id = models.CharField(unique=True, primary_key=True, max_length=20)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)


class AnalysisDocument(models.Model):
    analysis_document_id = models.AutoField(unique=True, primary_key=True)
    analysis_doc_title = models.CharField(max_length=100)
    upload_date = models.DateTimeField(auto_now_add=True)
    analysis_doc = models.FileField(upload_to='analysis_documents/')
    teacher_id = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    section_id = models.ForeignKey(Section, on_delete=models.CASCADE)


class FormativeAssessmentScore(models.Model):
    formative_assessment_score_id = models.AutoField(unique=True, primary_key=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

class PredictedScore(models.Model):
    predicted_score_id = models.AutoField(unique=True, primary_key=True)
    student_id = models.ForeignKey(Student, on_delete=models.CASCADE)
    score = models.FloatField()
    date = models.DateField(auto_now_add=True)
    formative_assessment_number = models.CharField(max_length=5)

