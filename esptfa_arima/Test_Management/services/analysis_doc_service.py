from Test_Management.models import TestDraft, IdempotencyKey, TestTopicMapping, TestTopic, AnalysisDocument, FormativeAssessmentScore
from django.contrib.auth.models import User
from Authentication.models import Student, Teacher
from arima_model.tasks import process_analysis_document
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# DRAFT
def get_or_create_draft(idempotency_key: str, user: User, **kwargs):
    try:
        # Check if this idempotency key has been used by this user before
        ik = IdempotencyKey.objects.filter(idempotency_key=idempotency_key, user=user).first()

        if ik:
            # Return the associated draft
            return TestDraft.objects.filter(test_draft_id=ik.returned_draft_key).first()

        # Create a new draft if not exists
        # Extract fields from kwargs
        title = kwargs.get('title', 'Untitled Test')
        quarter = kwargs.get('quarter')
        subject = kwargs.get('subject')
        section_id = kwargs.get('section_id')
        test_content = kwargs.get('test_content', {})
        status = kwargs.get('status', 'draft')

        draft = TestDraft.objects.create(
            user_teacher=user,
            title=title,
            quarter=quarter,
            subject=subject,
            section_id=section_id,
            test_content=test_content,
            status=status
        )
        
        # Record the idempotency key and link it to the draft
        IdempotencyKey.objects.create(
            idempotency_key=idempotency_key, 
            user=user, 
            returned_draft_key=draft.test_draft_id
        )

        return draft
    except Exception as e:
        logger.error(f"Error creating draft: {e}")
        raise



# ANALYSIS DOCUMENT
def create_analysis_document(draft: TestDraft):
    try:
        # determine if there is an associated teacher with the user
        teacher = Teacher.objects.filter(user_id=draft.user_teacher).first()
        if not teacher:
            raise ValueError("User is not a teacher")

        # Create the analysis document
        document = AnalysisDocument.objects.create(
            analysis_doc_title=draft.title,
            quarter=draft.quarter,
            subject=draft.subject,
            teacher=draft.user_teacher,
            section=draft.section_id,
            status=False,
        )

        # get the specific objs from the json from the test_content
        topics = draft.test_content['topics']
        scores = draft.test_content['scores']

        
        
        # Process test topics and get the mappings
        test_topic_mappings = create_topic_mappings(document, topics)

        # Process formative assessment scores
        process_formative_assessment_scores(document, scores, test_topic_mappings)
        
        return document
    except Teacher.DoesNotExist:
        logger.error("User is not a teacher")
        raise ValueError("User is not a teacher")
    except Exception as e:
        logger.error(f"Error creating analysis document: {e}")
        raise





# STARTING ARIMA MODEL
def start_arima_model(document):
    try:
        # pass for now since we need to modify arima_model
        pass
        # process_analysis_document(document.analysis_document_id)
    except Exception as e:
        logger.error(f"Error starting ARIMA model: {e}")
        raise
        




# FORMATIVE ASSESSMENT SCORES

"""Creates the formative assessment scores and commits them to the db"""
def process_formative_assessment_scores(document, scores, test_topic_mappings):
    PASSING_PERCENTAGE = 0.75
    try:
        # Create a lookup for mappings by test_number for efficiency
        mapping_lookup = {str(m.topic.test_number): m for m in test_topic_mappings}
        
        students = get_students_by_section(document.section.section_id)
        scores_arr = []

        # Iterate through the nested dictionary: scores[student_lrn][topic_id]
        for lrn, student_topics in scores.items():
            student = students.get(lrn)
            if not student:
                logger.error(f"Student with LRN {lrn} not found in section.")
                raise Student.DoesNotExist(f"Student with LRN {lrn} not found in section.")

            for topic_id, score_data in student_topics.items():
                test_num = str(score_data.get('test_number'))

                # get the topic mapping
                topic_mapping = mapping_lookup.get(test_num)

                # get the score
                score = score_data.get('score', 0)
                max_score = score_data.get('max_score', 0)

                # calculate passing threshold
                passing_threshold = max_score * PASSING_PERCENTAGE if max_score > 0 else 0
                
                scores_arr.append(FormativeAssessmentScore(
                    analysis_document=document,
                    student_id=student,
                    test_number=test_num,
                    score=score,
                    topic_mapping=topic_mapping,
                    passing_threshold=passing_threshold
                ))

        if scores_arr:
            FormativeAssessmentScore.objects.bulk_create(scores_arr)
            
    except Student.DoesNotExist as e:
        logger.error(f"Error processing formative assessment scores: {e}")
        raise
    except Exception as e:
        logger.error(f"Error processing formative assessment scores: {e}")
        raise




# UTILS
def get_students_by_section(section_id: int) -> Dict[str, Student]:
    try:
        students = Student.objects.filter(section_id=section_id)
        return {student.lrn: student for student in students}
    except Exception as e:
        logger.error(f"Error getting students by section: {e}")
        raise



# TEST TOPICS
def create_topic_mappings(document, topics: List[dict]):
    """Process the user-provided topic strings and create mappings. Returns the topic entries"""
    try:
        test_topics = create_topics(document, topics)
        if test_topics is None:
            raise ValueError("Failed to create topics")
            
        test_mappings = []
        for topic in test_topics:
            test_mappings.append(TestTopicMapping(
                analysis_document=document,
                topic=topic,
            ))
        return TestTopicMapping.objects.bulk_create(test_mappings)
    except Exception as e:
        logger.error(f"Error processing test topic mappings: {e}")
        raise


def create_topics(document, topics: List[dict]):
    try:
        test_topics = []
        for topic in topics:
            test_topics.append(TestTopic(
                topic_name=topic['name'],
                subject=document.subject,
                max_score=topic['max_score'],
                test_number=topic['test_number'],
            ))
        # save them to db and return the created objects with IDs
        return TestTopic.objects.bulk_create(test_topics)
    except Exception as e:
        logger.error(f"Error processing test mappings: {e}")
        raise



def process_default_topics(document, test_columns):
    """Create default topics based on column names."""
    for col in test_columns:
        if col.lower().startswith('fa'):
            test_num = col[2:].strip()  # Extract the number from "TestX"
            topic = TestTopic.get_or_create_topic(f"Topic for Test {test_num}")

            TestTopicMapping.objects.create(
                analysis_document=document,
                test_number=test_num,
                topic=topic
            )