
from rest_framework import serializers
from .models import Teacher, Student
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    acc_type = serializers.CharField(write_only=True, required=False)
    lrn = serializers.CharField(write_only=True, required=False, allow_null=True)
    section = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'acc_type', 'lrn', 'section']

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'



