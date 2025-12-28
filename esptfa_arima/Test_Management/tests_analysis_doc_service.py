from django.test import TestCase
from django.contrib.auth.models import User
from Test_Management.models import TestDraft, IdempotencyKey, Subject, Quarter, Section, AnalysisDocument, TestTopic, TestTopicMapping
from Authentication.models import Teacher
from Test_Management.services.analysis_doc_service import get_or_create_draft
import uuid

class AnalysisDocServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testteacher', password='password')
        self.teacher = Teacher.objects.create(user_id=self.user)
        self.subject = Subject.objects.create(subject_name='Mathematics')
        self.quarter = Quarter.objects.create(quarter_name='1st Quarter')
        self.section = Section.objects.create(section_name='Grade 10 - Rizal')
        
        self.document = AnalysisDocument.objects.create(
            analysis_doc_title="Main Document",
            quarter=self.quarter,
            subject=self.subject,
            teacher=self.user,
            section=self.section
        )
        
    def test_get_or_create_draft_creates_new(self):
        """Test that a new draft is created when an idempotency key is first used."""
        key = str(uuid.uuid4())
        draft = get_or_create_draft(
            key, 
            self.user, 
            title="Test Assessment",
            subject=self.subject,
            quarter=self.quarter,
            section_id=self.section
        )
        
        self.assertIsNotNone(draft)
        self.assertEqual(draft.title, "Test Assessment")
        self.assertEqual(draft.user_teacher, self.user)
        
        # Verify IdempotencyKey record exists
        ik = IdempotencyKey.objects.get(idempotency_key=key)
        self.assertEqual(ik.user, self.user)
        self.assertEqual(ik.returned_draft_key, draft.test_draft_id)

    def test_get_or_create_draft_idempotency(self):
        """Test that using the same key again returns the existing draft."""
        key = str(uuid.uuid4())
        
        # First call
        draft1 = get_or_create_draft(
            key, 
            self.user, 
            title="Draft 1",
            subject=self.subject,
            quarter=self.quarter,
            section_id=self.section
        )
        
        # Second call with same key
        draft2 = get_or_create_draft(
            key, 
            self.user,
            title="Draft 2 (should be ignored)",
            subject=self.subject,
            quarter=self.quarter,
            section_id=self.section
        )
        
        self.assertEqual(draft1.test_draft_id, draft2.test_draft_id)
        self.assertEqual(draft2.title, "Draft 1") # Title from first creation
        self.assertEqual(TestDraft.objects.count(), 1)
        self.assertEqual(IdempotencyKey.objects.count(), 1)

    def test_get_or_create_draft_different_users(self):
        """
        Test that different users with the same key get different drafts.
        """
        from django.db import transaction
        user2 = User.objects.create_user(username='testteacher2', password='password')
        key = str(uuid.uuid4())
        
        # User 1 creates
        get_or_create_draft(
            key, 
            self.user, 
            title="User 1 Draft",
            subject=self.subject,
            quarter=self.quarter,
            section_id=self.section
        )
        
        # User 2 tries with same key
        # We wrap in atomic() because the service will trigger an IntegrityError 
        # which would break the TestCase transaction.
        with transaction.atomic():
            draft2 = get_or_create_draft(
                key, 
                user2, 
                title="User 2 Draft",
                subject=self.subject,
                quarter=self.quarter,
                section_id=self.section
            )
        
        self.assertIsNone(draft2)

    def test_get_or_create_draft_error_handling(self):
        """Test it returns None if there's a database error (e.g. missing required field)."""
        from django.db import transaction
        key = str(uuid.uuid4())
        # Subject is required in TestDraft, so omitting it should trigger an error
        with transaction.atomic():
            draft = get_or_create_draft(
                key, 
                self.user, 
                title="Incomplete Draft"
                # subject missing
            )
        
        self.assertIsNone(draft)
        self.assertEqual(TestDraft.objects.count(), 0)
        self.assertEqual(IdempotencyKey.objects.count(), 0)

