
# enum for acc_type
from enum import Enum
ACC_TYPE = Enum("ACC_TYPE", "teacher student")





# registers a user and determines whether they are a teacher or not
def register_user(username, password, first_name, last_name, email, acc_type, lrn=None):
    user = User.objects.create_user(username, email, password)
    user.first_name = first_name
    user.last_name = last_name
    user.is_active = False
    user.save()

    # create teacher or student that is linked to the user account
    if acc_type == ACC_TYPE.teacher:
        Teacher.objects.create(user_id=user)
    elif acc_type == ACC_TYPE.student:
        Student.objects.create(user_id=user, lrn=lrn)
    return user