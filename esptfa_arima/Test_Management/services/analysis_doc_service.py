from Test_Management.models import TestDraft, IdempotencyKey, TestTopicMapping, TestTopic, AnalysisDocument
from django.contrib.auth.models import User
from Authentication.models import Student
import logging
from typing import List

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
        return None



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
        return None
    except Exception as e:
        logger.error(f"Error creating analysis document: {e}")
        return None









# FORMATIVE ASSESSMENT SCORES

"""Creates the formative assessment scores and commits them to the db"""
def process_formative_assessment_scores(document, scores, test_topic_mappings):
    try:
        pass
    except Exception as e:
        logger.error(f"Error processing formative assessment scores: {e}")
        return None









# TEST TOPICS
def create_topic_mappings(document, topics: List[dict]):
    """Process the user-provided topic strings and create mappings. Returns the topic entries"""
    try:
        test_topics = create_topics(document, topics)
        test_mappings = []
        for topic in test_topics:
            test_mappings.append(TestTopicMapping(
                analysis_document=document,
                topic=topic,
            ))
        TestTopicMapping.objects.bulk_create(test_mappings)
        return test_mappings
    except Exception as e:
        logger.error(f"Error processing test topic mappings: {e}")
        return None


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
        # save them to db
        TestTopic.objects.bulk_create(test_topics)
        return test_topics
    except Exception as e:
        logger.error(f"Error processing test mappings: {e}")
        return None





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