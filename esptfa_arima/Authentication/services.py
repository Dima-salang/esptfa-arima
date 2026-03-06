import logging
import pandas as pd
import random
import string
import re
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.base import File
from rest_framework.exceptions import ValidationError as DRFValidationError
from Test_Management.models import Section
from .models import Teacher, Student
from model_types import ACC_TYPE
from django.db import transaction

logger = logging.getLogger(__name__)


def login_user(username, password):
    user = authenticate(username=username, password=password)
    if user is not None and user.is_active:
        return user
    return None


# registers a user and determines whether they are a teacher or not
# uses lrn=None as a default value if the user is not a student
def register_user(
    username,
    password,
    first_name,
    middle_name,
    last_name,
    email,
    acc_type,
    lrn=None,
    section_id=None,
):
    logger.info(f"Attempting to register user: {username} ({acc_type})")
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=False,
    )

    # Convert empty strings to None
    if lrn == "":
        lrn = None
    if section_id == "":
        section_id = None

    # create teacher or student that is linked to the user account if applicable
    acc_type_enum = None
    if isinstance(acc_type, str):
        try:
            acc_type_enum = ACC_TYPE[acc_type.upper()]
        except (KeyError, ValueError):
            # Not a Teacher or Student, probably an Admin or generic user
            pass
    elif isinstance(acc_type, ACC_TYPE):
        acc_type_enum = acc_type

    if acc_type_enum == ACC_TYPE.TEACHER:
        Teacher.objects.create(user_id=user)
        logger.info(f"Successfully registered teacher: {username}")
    elif acc_type_enum == ACC_TYPE.STUDENT:
        if section_id is None:
            logger.error(f"Registration failed for {username}: Section ID missing.")
            user.delete()  # Cleanup if validation failed late
            raise ValidationError("Section ID is required for student registration")
        try:
            section = Section.objects.get(section_id=section_id)
        except Section.DoesNotExist:
            logger.error(
                f"Registration failed for {username}: Section {section_id} not found."
            )
            user.delete()  # Cleanup
            raise ValidationError("Section does not exist")

        # check if there is already an existing student record globally by LRN
        student_obj = Student.objects.filter(lrn=lrn).first()

        if student_obj:
            if student_obj.user_id is None:
                # Link the existing unlinked student record to this user
                student_obj.user_id = user
                student_obj.first_name = first_name
                student_obj.middle_name = middle_name
                student_obj.last_name = last_name
                student_obj.save()
                logger.info(
                    f"Successfully linked existing student record {lrn} to user {username}"
                )
            else:
                # Record is already taken by another user
                logger.warning(
                    f"Registration failed for {username}: LRN {lrn} already taken."
                )
                user.delete()
                raise ValidationError(
                    "A student with this LRN is already registered with another account."
                )
        else:
            # No existing record, create a new one
            Student.objects.create(
                user_id=user,
                lrn=lrn,
                section=section,
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
            )
            logger.info(f"Successfully registered new student: {username} (LRN: {lrn})")

    return user


def generate_credentials(first_name, middle_name, last_name):
    first_initials = "".join([part[0].lower() for part in first_name.split() if part])
    middle_initials = (
        "".join([part[0].lower() for part in middle_name.split() if part])
        if middle_name
        else ""
    )
    last_cleaned = re.sub(r"[^a-zA-Z0-9]", "", last_name).lower()

    base_username = f"{first_initials}{middle_initials}{last_cleaned}"

    random_digits = "".join(random.choices(string.digits, k=6))
    password = f"{last_cleaned}{random_digits}"

    return base_username, password


def generate_unique_username(base_username):
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
    return username


# processing csv for bulk import
def process_csv_import(file: File, allowed_section: Section = None) -> None:
    try:
        # read the excel file
        try:
            students_csv = pd.read_excel(file)
        except Exception as e:
            logger.error(f"Failed to read Excel file: {str(e)}")
            raise DRFValidationError(
                f"Could not read the Excel file. Please ensure it is a valid Excel file (.xlsx or .xls). Error: {str(e)}"
            )

        # Normalize column names to lowercase and strip whitespace
        students_csv.columns = students_csv.columns.str.strip().str.lower()
        validated_csv = validate_csv(students_csv)

        # get the sections dictionary if allowed_section is not fixed
        sections_dict = {}
        if not allowed_section:
            sections_dict = get_sections_dict()

        students_data = []
        seen_lrns = set()

        # loop through the csv file and prepare the students
        for index, row in validated_csv.iterrows():
            if allowed_section:
                section = allowed_section
            else:
                section_name = str(row["section"]).strip()
                # Case-insensitive lookup
                section = sections_dict.get(section_name.upper())

            if not section:
                msg = (
                    f"Section '{section_name}' does not exist"
                    if not allowed_section
                    else "Advisory section not found."
                )
                raise DRFValidationError(msg)

            try:
                # Handle pandas potential float conversion and strip spaces
                lrn_val = row["lrn"]
                if pd.isna(lrn_val):
                    raise DRFValidationError(f"Row {index + 1}: LRN is missing")

                lrn = str(lrn_val).strip()
                if lrn.endswith(".0"):
                    lrn = lrn[:-2]

                if len(lrn) != 12:
                    raise DRFValidationError(
                        f"Row {index + 1}: LRN '{lrn}' is {len(lrn)} characters long, but must be exactly 12."
                    )

                if lrn in seen_lrns:
                    raise DRFValidationError(
                        f"Row {index + 1}: Duplicate LRN '{lrn}' found in the CSV file."
                    )
                seen_lrns.add(lrn)
                first_name = str(row["first_name"]).strip()
                middle_name = (
                    str(row["middle_name"]).strip()
                    if pd.notna(row["middle_name"])
                    else ""
                )
                last_name = str(row["last_name"]).strip()

                # see if student already exists
                student_obj = Student.objects.filter(lrn=lrn).first()
                if student_obj:
                    raise DRFValidationError(
                        f"Row {index + 1}:LRN '{lrn}' already exists"
                    )

                base_username, initial_password = generate_credentials(
                    first_name, middle_name, last_name
                )

                students_data.append(
                    {
                        "lrn": lrn,
                        "section": section,
                        "first_name": first_name,
                        "middle_name": middle_name,
                        "last_name": last_name,
                        "base_username": base_username,
                        "initial_password": initial_password,
                    }
                )
            except DRFValidationError as e:
                logger.error(f"CSV Import Row {index + 1} validation error: {e.detail}")
                raise
            except Exception as e:
                logger.error(f"CSV Import Row {index + 1} unexpected error: {str(e)}")
                raise DRFValidationError(f"Row {index + 1}: {str(e)}")

        # save the students and create users in a single transaction
        with transaction.atomic():
            for s_data in students_data:
                username = generate_unique_username(s_data["base_username"])
                user = User.objects.create_user(
                    username=username,
                    password=s_data["initial_password"],
                    first_name=s_data["first_name"],
                    last_name=s_data["last_name"],
                    is_active=True,
                )
                Student.objects.create(
                    lrn=s_data["lrn"],
                    section=s_data["section"],
                    first_name=s_data["first_name"],
                    middle_name=s_data["middle_name"],
                    last_name=s_data["last_name"],
                    user_id=user,
                    initial_password=s_data["initial_password"],
                    requires_password_change=True,
                )

    except Exception as e:
        if isinstance(e, (ValidationError, DRFValidationError)):
            raise e
        raise ValidationError(str(e))


def validate_csv(df: pd.DataFrame) -> pd.DataFrame:
    required_columns = ["lrn", "first_name", "middle_name", "last_name", "section"]
    if not all(col in df.columns for col in required_columns):
        raise DRFValidationError(
            f"Excel file must have the following columns: {', '.join(required_columns)}"
        )

    return df


# return the dict which contains {section_name: section_object}
# since the csv will contain the section names, this will be used to match the section names to the section objects
def get_sections_dict() -> dict:
    try:
        sections = Section.objects.all()
        # Use upper case for case-insensitive matching
        sections_dict = {section.section_name.upper(): section for section in sections}
        return sections_dict
    except Exception as e:
        raise ValidationError(str(e))


# manual importing of students
# accepts an array of students to be created
def process_manual_import(
    students: list[dict], allowed_section: Section = None
) -> None:
    try:
        sections_dict = {}
        if not allowed_section:
            sections = Section.objects.all()
            sections_dict = {section.section_id: section for section in sections}

        students_data = []
        seen_lrns = set()
        # loop through the students and prepare them
        for index, student in enumerate(students):
            try:
                lrn_val = student.get("lrn")
                if not lrn_val:
                    raise DRFValidationError(f"Row {index + 1}: LRN is missing")

                lrn = str(lrn_val).strip()
                if lrn.endswith(".0"):
                    lrn = lrn[:-2]

                if len(lrn) != 12:
                    raise DRFValidationError(
                        f"Row {index + 1}: LRN '{lrn}' is {len(lrn)} characters long, but must be exactly 12."
                    )

                if lrn in seen_lrns:
                    raise DRFValidationError(
                        f"Row {index + 1}: Duplicate LRN '{lrn}' found in the import list."
                    )
                seen_lrns.add(lrn)
                first_name = str(student.get("first_name")).strip()
                middle_name = str(student.get("middle_name", "") or "").strip()
                last_name = str(student.get("last_name")).strip()

                if allowed_section:
                    section = allowed_section
                else:
                    section_input = student.get("section")
                    # Determine the section object
                    try:
                        int_section = int(section_input)
                        section = sections_dict.get(int_section)
                    except (ValueError, TypeError):
                        section = None

                    if not section:
                        raise DRFValidationError(
                            f"Row {index + 1}: Section '{section_input}' does not exist"
                        )

                # Check for existing student
                if Student.objects.filter(lrn=lrn).exists():
                    raise DRFValidationError(
                        f"Row {index + 1}: Student with LRN '{lrn}' already exists"
                    )

                base_username, initial_password = generate_credentials(
                    first_name, middle_name, last_name
                )

                students_data.append(
                    {
                        "lrn": lrn,
                        "first_name": first_name,
                        "middle_name": middle_name,
                        "last_name": last_name,
                        "section": section,
                        "base_username": base_username,
                        "initial_password": initial_password,
                    }
                )
            except DRFValidationError:
                raise
            except Exception as e:
                raise DRFValidationError(f"Row {index + 1}: {str(e)}")

        # save the students and create users in a single transaction
        with transaction.atomic():
            for s_data in students_data:
                username = generate_unique_username(s_data["base_username"])
                user = User.objects.create_user(
                    username=username,
                    password=s_data["initial_password"],
                    first_name=s_data["first_name"],
                    last_name=s_data["last_name"],
                    is_active=True,
                )
                Student.objects.create(
                    lrn=s_data["lrn"],
                    first_name=s_data["first_name"],
                    middle_name=s_data["middle_name"],
                    last_name=s_data["last_name"],
                    section=s_data["section"],
                    user_id=user,
                    initial_password=s_data["initial_password"],
                    requires_password_change=True,
                )

    except Exception as e:
        if isinstance(e, (ValidationError, DRFValidationError)):
            raise e
        raise ValidationError(str(e))
