from rest_framework import serializers
from .models import Teacher, Student
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    acc_type = serializers.CharField(required=False, allow_blank=True)
    lrn = serializers.CharField(
        write_only=True, required=False, allow_null=True, allow_blank=True
    )
    section = serializers.CharField(
        write_only=True, required=False, allow_null=True, allow_blank=True
    )
    middle_name = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "middle_name",
            "last_name",
            "password",
            "acc_type",
            "lrn",
            "section",
            "is_active",
            "is_superuser",
        ]
        read_only_fields = ["is_active", "is_superuser"]

    def validate_password(self, value):
        if not value:  # Optional password on update
            return value
        try:
            validate_password(value)
        except Exception as e:
            raise serializers.ValidationError(
                list(e.messages) if hasattr(e, "messages") else str(e)
            )
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if hasattr(instance, "teacher"):
            ret["acc_type"] = "TEACHER"
            # Import Section here to avoid circular dependencies
            from Test_Management.models import Section

            advising_section = Section.objects.filter(adviser=instance).first()
            if advising_section:
                ret["advising_section"] = {
                    "id": advising_section.section_id,
                    "name": advising_section.section_name,
                }
        elif hasattr(instance, "student"):
            ret["acc_type"] = "STUDENT"
            if instance.student.section:
                ret["section_details"] = {
                    "id": instance.student.section.section_id,
                    "name": instance.student.section.section_name,
                }
            else:
                ret["section_details"] = None
        else:
            ret["acc_type"] = "ADMIN" if instance.is_superuser else "USER"

        # Add basic info about related profiles if they exist
        if hasattr(instance, "teacher"):
            ret["teacher_id"] = instance.teacher.id
        if hasattr(instance, "student"):
            ret["student_lrn"] = instance.student.lrn
            ret["requires_password_change"] = instance.student.requires_password_change

        return ret


class AdminUserSerializer(UserSerializer):
    is_active = serializers.BooleanField(required=False)
    is_superuser = serializers.BooleanField(required=False)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["date_joined", "last_login"]
        read_only_fields = ["date_joined", "last_login"]

    def create(self, validated_data):
        from .services import register_user

        username = validated_data.pop("username")
        password = validated_data.pop("password")
        email = validated_data.pop("email", "")
        first_name = validated_data.pop("first_name", "")
        middle_name = validated_data.pop("middle_name", "")
        last_name = validated_data.pop("last_name", "")
        acc_type = validated_data.pop("acc_type", "ADMIN")
        lrn = validated_data.pop("lrn", None)
        section_id = validated_data.pop("section", None)

        is_active = validated_data.pop("is_active", True)
        is_superuser = validated_data.pop("is_superuser", False)

        from django.core.exceptions import ValidationError as DjangoValidationError

        # We use a modified version of register_user logic to allow immediate activation and superuser status
        # but we can also just call register_user and then update the user object
        try:
            user = register_user(
                username=username,
                password=password,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                email=email,
                acc_type=acc_type,
                lrn=lrn,
                section_id=section_id,
            )
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                e.message_dict if hasattr(e, "message_dict") else e.messages
            )

        # Apply admin-specified flags
        user.is_active = is_active
        user.is_superuser = is_superuser
        if is_superuser:
            user.is_staff = True
        user.save()

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)


class TeacherSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)
    user_pk = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user_id",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Teacher
        fields = "__all__"
        depth = 1


class StudentSerializer(serializers.ModelSerializer):
    user_id = UserSerializer(read_only=True)
    user_pk = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user_id",
        write_only=True,
        required=False,
        allow_null=True,
    )
    initial_password = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = "__all__"
        depth = 1

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import Section here to avoid circular dependencies
        from Test_Management.models import Section

        self.fields["section_id"] = serializers.PrimaryKeyRelatedField(
            queryset=Section.objects.all(),
            source="section",
            write_only=True,
            required=False,
        )

    def get_initial_password(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            # Only the section adviser or an admin can see the initial password
            if request.user.is_superuser or (
                hasattr(obj.section, "adviser") and obj.section.adviser == request.user
            ):
                return obj.initial_password
        return None

    def validate(self, attrs):
        # validate the lrn to be only 12 chars long
        lrn = attrs.get("lrn")
        if lrn is not None and len(lrn) != 12:
            raise serializers.ValidationError(
                {"lrn": "LRN must be 12 characters long."}
            )
        return attrs
