from django.contrib.auth.models import User
from .models import Teacher, Student
from model_types import ACC_TYPE
from django.contrib.auth import authenticate
from Test_Management.models import Section
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
import pandas as pd
from django.core.files.base import File

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
            raise ValidationError("Section ID is required for student registration")
        try:
            section = Section.objects.get(section_id=section_id)
        except Section.DoesNotExist:
            user.delete() # Cleanup
            raise ValidationError("Section does not exist")

        # check if there is already an existing student record
        student_obj = Student.objects.filter(lrn=lrn, section=section).first()
        
        if student_obj:
            if student_obj.user_id is None:
                # Link the existing unlinked student record to this user
                student_obj.user_id = user
                student_obj.first_name = first_name
                student_obj.last_name = last_name
                student_obj.save()
            else:
                # Record is already taken by another user
                user.delete()
                raise ValidationError("A student with this LRN is already registered with another account.")
        else:
            # No existing record, create a new one
            Student.objects.create(user_id=user, lrn=lrn, section=section, first_name=first_name, last_name=last_name, middle_name=middle_name)

    
    return user


# processing csv for bulk import
def process_csv_import(file: File) -> None:
    try:
        # read the csv file
        students_csv = pd.read_csv(file)
        validated_csv = validate_csv(students_csv)

        # get the sections dictionary
        sections_dict = get_sections_dict()

        students_to_save = []

        # loop through the csv file and create the students
        for index, row in validated_csv.iterrows():
            try:
                section = sections_dict[row["section"]]
            except KeyError:
                raise DRFValidationError("Section does not exist")

            try:
                lrn = row["lrn"]
                first_name = row["first_name"]
                middle_name = row["middle_name"]
                last_name = row["last_name"]

                students_to_save.append(
                    Student(
                        lrn=lrn,
                        section=section,
                        first_name=first_name,
                        middle_name=middle_name,
                        last_name=last_name
                    )
                )
            except Exception as e:
                raise DRFValidationError(str(e))

        # save the students
        Student.objects.bulk_create(students_to_save)




        # parse
    except Exception as e:
        raise ValidationError(str(e))

def validate_csv(df: pd.DataFrame) -> pd.DataFrame:
    try:
        # check if the csv file has the correct columns
        if not all(col.lower() in df.columns for col in ["lrn", "first_name", "middle_name", "last_name", "section"]):
            raise DRFValidationError("CSV file must have the following columns: lrn, first_name, middle_name, last_name, section")
        
        return df
    except Exception as e:
        raise ValidationError(str(e))


# return the dict which contains {section_name: section_object}
# since the csv will contain the section names, this will be used to match the section names to the section objects
def get_sections_dict() -> dict:
    try:
        sections = Section.objects.all()
        sections_dict = {section.section_name: section for section in sections}
        return sections_dict
    except Exception as e:
        raise ValidationError(str(e))

        

