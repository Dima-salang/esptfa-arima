
from rest_framework import serializers
from .models import Teacher, Student
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    acc_type = serializers.CharField(required=False)
    lrn = serializers.CharField(write_only=True, required=False, allow_null=True)
    section = serializers.CharField(write_only=True, required=False, allow_null=True)
    middle_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'middle_name', 'last_name', 'password', 'acc_type', 'lrn', 'section']
    
    def validate_password(self, value):
        try:
            validate_password(value)
        except Exception as e:
            raise serializers.ValidationError(list(e.messages) if hasattr(e, 'messages') else str(e))
        return value


    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if hasattr(instance, 'teacher'):
            ret['acc_type'] = 'TEACHER'
        elif hasattr(instance, 'student'):
            ret['acc_type'] = 'STUDENT'
        else:
            ret['acc_type'] = 'ADMIN' if instance.is_superuser else 'USER'
        return ret

class TeacherSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)

    class Meta:
        model = Teacher
        fields = '__all__'
        depth = 1


class StudentSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)

    class Meta:
        model = Student
        fields = '__all__'
        depth = 1

    def validate(self, attrs):
        # validate the lrn to be only 11 chars long
        if attrs['lrn'] is not None and len(attrs['lrn']) != 11:
            raise serializers.ValidationError("LRN must be 11 characters long.")
        return attrs



