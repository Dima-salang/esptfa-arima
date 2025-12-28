from django.test import TestCase
from django.contrib.auth.models import User
from Test_Management.models import TestDraft, IdempotencyKey, Subject, Quarter, Section, AnalysisDocument, TestTopic, TestTopicMapping, FormativeAssessmentScore
from Authentication.models import Teacher, Student
from Test_Management.services.analysis_doc_service import (
    get_or_create_draft, create_analysis_document, create_topic_mappings, 
    create_topics, process_formative_assessment_scores, get_students_by_section
)
import uuid

class AnalysisDocServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testteacher', password='password')
        self.teacher = Teacher.objects.create(user_id=self.user)
        self.subject = Subject.objects.create(subject_name='Mathematics')
        self.quarter = Quarter.objects.create(quarter_name='1st Quarter')
        self.section = Section.objects.create(section_name='Grade 10 - Rizal')
        
        # Create some students
        self.student_user1 = User.objects.create_user(username='student1', first_name='Juan', last_name='Luna')
        self.student1 = Student.objects.create(lrn='123456789012', user_id=self.student_user1, section=self.section)
        
        self.student_user2 = User.objects.create_user(username='student2', first_name='Maria', last_name='Clara')
        self.student2 = Student.objects.create(lrn='123456789013', user_id=self.student_user2, section=self.section)

        self.draft_data = {
            'topics': [
                {'id': 'topic-1', 'name': 'Algebra', 'max_score': 50, 'test_number': '1'},
                {'id': 'topic-2', 'name': 'Geometry', 'max_score': 50, 'test_number': '2'}
            ],
            'scores': {
                '123456789012': {
                    'topic-1': {'score': 45, 'max_score': 50, 'test_number': '1'},
                    'topic-2': {'score': 38, 'max_score': 50, 'test_number': '2'}
                },
                '123456789013': {
                    'topic-1': {'score': 50, 'max_score': 50, 'test_number': '1'},
                    'topic-2': {'score': 42, 'max_score': 50, 'test_number': '2'}
                }
            }
        }
        
    def test_get_or_create_draft_creates_new(self):
        key = str(uuid.uuid4())
        draft = get_or_create_draft(
            key, 
            self.user, 
            title="Test Assessment",
            subject=self.subject,
            quarter=self.quarter,
            section_id=self.section,
            test_content=self.draft_data
        )
        
        self.assertIsNotNone(draft)
        self.assertEqual(draft.title, "Test Assessment")
        self.assertEqual(draft.test_content['topics'][0]['name'], 'Algebra')

    def test_create_analysis_document_success(self):
        draft = TestDraft.objects.create(
            user_teacher=self.user,
            title="Final Exam",
            quarter=self.quarter,
            subject=self.subject,
            section_id=self.section,
            test_content=self.draft_data
        )
        
        doc = create_analysis_document(draft)
        
        self.assertIsNotNone(doc)
        self.assertEqual(doc.analysis_doc_title, "Final Exam")
        self.assertEqual(TestTopicMapping.objects.filter(analysis_document=doc).count(), 2)
        self.assertEqual(FormativeAssessmentScore.objects.filter(analysis_document=doc).count(), 4)
        
        # Verify specific score calculation (75% of 50 = 37.5)
        score1 = FormativeAssessmentScore.objects.filter(student_id=self.student1, test_number="1").first()
        self.assertEqual(score1.score, 45)
        self.assertEqual(score1.passing_threshold, 37.5)
        self.assertIsNotNone(score1.topic_mapping)

    def test_create_topics_and_mappings(self):
        doc = AnalysisDocument.objects.create(
            analysis_doc_title="Test Doc",
            quarter=self.quarter,
            subject=self.subject,
            teacher=self.user,
            section=self.section
        )
        
        mappings = create_topic_mappings(doc, self.draft_data['topics'])
        
        self.assertEqual(len(mappings), 2)
        self.assertEqual(TestTopic.objects.count(), 2)
        self.assertEqual(mappings[0].topic.topic_name, 'Algebra')
        self.assertEqual(mappings[0].topic.test_number, '1')

    def test_get_students_by_section(self):
        lookup = get_students_by_section(self.section.section_id)
        self.assertIn('123456789012', lookup)
        self.assertIn('123456789013', lookup)
        self.assertEqual(lookup['123456789012'], self.student1)

    def test_process_scores_missing_student(self):
        doc = AnalysisDocument.objects.create(
            analysis_doc_title="Test Doc",
            quarter=self.quarter,
            subject=self.subject,
            teacher=self.user,
            section=self.section
        )
        bad_scores = {
            'INVALID_LRN': {
                'topic-1': {'score': 10, 'max_score': 50, 'test_number': 1}
            }
        }
        self.assertRaises(Student.DoesNotExist, process_formative_assessment_scores, doc, bad_scores, [])

    def test_create_analysis_document_not_teacher(self):
        normal_user = User.objects.create_user(username='normaluser', password='password')
        draft = TestDraft.objects.create(
            user_teacher=normal_user,
            title="Sneaky Draft",
            quarter=self.quarter,
            subject=self.subject,
            section_id=self.section,
            test_content=self.draft_data
        )
        self.assertRaises(ValueError, create_analysis_document, draft)
