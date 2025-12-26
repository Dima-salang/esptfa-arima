from django.contrib.auth.models import User
from .models import Teacher, Student
from ..model_types import ACC_TYPE


def login_user(username, password):
    user = User.objects.filter(username=username).first()
    if user is not None and user.check_password(password) and user.is_active:
        return user
    return None

# registers a user and determines whether they are a teacher or not
# uses lrn=None as a default value if the user is not a student
def register_user(username, password, first_name, last_name, email, acc_type, lrn=None, section=None):
    user = User.objects.create_user(username, email, password)
    user.first_name = first_name
    user.last_name = last_name
    user.is_active = False
    user.save()

    # create teacher or student that is linked to the user account
    if acc_type == ACC_TYPE.TEACHER:
        Teacher.objects.create(user_id=user)
    elif acc_type == ACC_TYPE.STUDENT:
        Student.objects.create(user_id=user, lrn=lrn, section=section)
    return user