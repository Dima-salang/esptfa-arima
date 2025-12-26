from django.db import models
from django.contrib.auth.models import User
# Create your models here.


class Teacher(models.Model):
    teacher_id = models.CharField(unique=True, primary_key=True, max_length=20)
    user_id = models.OneToOneField(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.user_id.get_full_name() or self.user_id.username


class Student(models.Model):
    lrn = models.CharField(unique=True, primary_key=True, max_length=11)
    user_id = models.OneToOneField(User, on_delete=models.CASCADE)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.user_id.get_full_name() or self.user_id.username

