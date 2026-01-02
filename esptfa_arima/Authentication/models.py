from django.db import models
from django.contrib.auth.models import User
# Create your models here.


class Teacher(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.OneToOneField(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.user_id.get_full_name() or self.user_id.username


class Student(models.Model):
    first_name = models.CharField(max_length=50, blank=True)
    middle_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    lrn = models.CharField(unique=True, primary_key=True, max_length=11)
    user_id = models.OneToOneField(User, on_delete=models.CASCADE, null=True)
    section = models.ForeignKey('Test_Management.Section', on_delete=models.CASCADE)
    
    def __str__(self):
        return self.user_id.get_full_name() if self.user_id else self.lrn

