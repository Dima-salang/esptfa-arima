from django.contrib.auth.models import User
from .models import Teacher, Student
from model_types import ACC_TYPE
from django.contrib.auth import authenticate
from Test_Management.models import Section

def login_user(username, password):
    user = authenticate(username=username, password=password)
    if user is not None and user.is_active:
        return user
    return None

# registers a user and determines whether they are a teacher or not
# uses lrn=None as a default value if the user is not a student
def register_user(username, password, first_name, last_name, email, acc_type, lrn=None, section_id=None):
    user = User.objects.create_user(
        username=username, 
        email=email, 
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=False
    )

    # create teacher or student that is linked to the user account
    if isinstance(acc_type, str):
        try:
            acc_type = ACC_TYPE[acc_type.upper()]
        except KeyError:
            # Fallback for old lowercase values if necessary, or just raise error
            acc_type = ACC_TYPE(acc_type.lower()) 

    if acc_type == ACC_TYPE.TEACHER:
        Teacher.objects.create(user_id=user)
    elif acc_type == ACC_TYPE.STUDENT:
        if section_id is None:
            user.delete() # Cleanup if validation failed late
            raise ValueError("Section ID is required for student registration")
        try:
            section = Section.objects.get(section_id=section_id)
        except Section.DoesNotExist:
            user.delete() # Cleanup
            raise ValueError("Section does not exist")

        # check if there is already an existing student, then we link it to the user account 
        if Student.objects.filter(lrn=lrn, section=section).exists():
            student = Student.objects.get(lrn=lrn, section=section)
            student.user_id = user
            student.save()
            return user

        Student.objects.create(user_id=user, lrn=lrn, section=section)
    
    return user