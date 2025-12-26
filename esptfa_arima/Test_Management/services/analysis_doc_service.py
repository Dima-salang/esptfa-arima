from Test_Management.models import TestDraft, IdempotencyKey, TestTopicMapping, TestTopic
from django.contrib.auth.models import User



# DRAFT
def get_or_create_draft(idempotency_key: str, user: User):
    try:
        # Check if this idempotency key has been used by this user before
        ik = IdempotencyKey.objects.filter(idempotency_key=idempotency_key, user=user).first()

        if ik:
            # Return the associated draft
            return TestDraft.objects.filter(test_draft_id=ik.returned_draft_key).first()

        # Create a new draft if not exists
        # Initializing with empty dict for test_content if not provided
        draft = TestDraft.objects.create(user=user, test_content={})
        
        # Record the idempotency key and link it to the draft
        IdempotencyKey.objects.create(
            idempotency_key=idempotency_key, 
            user=user, 
            returned_draft_key=draft.test_draft_id
        )

        return draft
    except Exception:
        return None
















# TEST TOPICS
def process_test_topics(document, topics_str):
    """Process the user-provided topic strings and create mappings. Returns the topic entries"""
    # Split by commas or new lines
    topic_entries = [entry.strip() for entry in topics_str.replace(
        '\n', ',').split(',') if entry.strip()]

    for entry in topic_entries:
        if ':' in entry:
            test_num, topic_name = entry.split(':', 1)
            test_num = test_num.strip()
            topic_name = topic_name.strip()

            # Skip if either part is empty
            if not test_num or not topic_name:
                continue

            # Remove "Test" prefix if present
            if test_num.lower().startswith('fa'):
                test_num = test_num[2:].strip()

            # Get or create the topic (handles duplicates)
            topic = TestTopic.get_or_create_topic(topic_name)

            # Create the mapping
            TestTopicMapping.objects.update_or_create(
                analysis_document=document,
                test_number=test_num,
                defaults={'topic': topic}
            )



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