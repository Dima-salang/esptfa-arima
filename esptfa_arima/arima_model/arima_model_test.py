from django.test import TestCase
from django.contrib.auth.models import User
from Authentication.models import Student
from Test_Management.models import (
    AnalysisDocument, Subject, Quarter, Section, 
    TestTopic, TestTopicMapping, FormativeAssessmentScore
)
from arima_model.arima_model import preprocess_data
import pandas as pd

class PreprocessDataTest(TestCase):
    def setUp(self):
        # Create common setup data
        self.user = User.objects.create_user(username="teacher1", password="password")
        self.section = Section.objects.create(section_name="Section A")
        self.subject = Subject.objects.create(subject_name="Math")
        self.quarter = Quarter.objects.create(quarter_name="1st Quarter")
        
        self.analysis_doc = AnalysisDocument.objects.create(
            analysis_doc_title="Test Document",
            teacher=self.user,
            section=self.section,
            subject=self.subject,
            quarter=self.quarter
        )
        
        # Create a student
        self.student_user = User.objects.create_user(
            username="student1", first_name="John", last_name="Doe"
        )
        self.student = Student.objects.create(
            lrn="12345678901",
            user_id=self.student_user,
            section=self.section
        )
        
        # Create topics and mappings
        self.topic1 = TestTopic.objects.create(
            topic_name="Topic 1",
            max_score=50,
            subject=self.subject
        )
        self.mapping1 = TestTopicMapping.objects.create(
            analysis_document=self.analysis_doc,
            topic=self.topic1
        )
        
        self.topic2 = TestTopic.objects.create(
            topic_name="Topic 2",
            max_score=100,
            subject=self.subject
        )
        self.mapping2 = TestTopicMapping.objects.create(
            analysis_document=self.analysis_doc,
            topic=self.topic2
        )
        
        # Create scores
        FormativeAssessmentScore.objects.create(
            analysis_document=self.analysis_doc,
            student_id=self.student,
            score=40,
            test_number="1",
            topic_mapping=self.mapping1
        )
        
        FormativeAssessmentScore.objects.create(
            analysis_document=self.analysis_doc,
            student_id=self.student,
            score=80,
            test_number="2",
            topic_mapping=self.mapping2
        )

    def test_preprocess_data_returns_correct_dataframe(self):
        """Test that preprocess_data correctly converts DB scores to a DataFrame."""
        df = preprocess_data(self.analysis_doc)
        
        self.assertIsInstance(df, pd.DataFrame)
        self.assertEqual(len(df), 2)
        
        # Check first score
        score1 = df[df["test_number"] == 1].iloc[0]
        self.assertEqual(score1["student_id"], "12345678901")
        self.assertEqual(score1["first_name"], "John")
        self.assertEqual(score1["last_name"], "Doe")
        self.assertEqual(score1["score"], 40)
        self.assertEqual(score1["max_score"], 50)
        self.assertEqual(score1["normalized_scores"], 40/50)
        self.assertEqual(score1["section"], "Section A")

        # Check second score
        score2 = df[df["test_number"] == 2].iloc[0]
        self.assertEqual(score2["score"], 80)
        self.assertEqual(score2["max_score"], 100)
        self.assertEqual(score2["normalized_scores"], 80/100)

    def test_preprocess_data_sorting(self):
        """Test that preprocess_data sorts results by student and date."""
        # The scores are already created in order in setUp, but let's verify sorting
        df = preprocess_data(self.analysis_doc)
        # Check if it's sorted by test_number (which indirectly implies date if created sequentially)
        self.assertTrue(list(df["test_number"]) == sorted(list(df["test_number"])))

    def test_preprocess_data_empty(self):
        """Test that preprocess_data handles documents with no scores gracefully."""
        # Create dummy doc with no scores
        empty_doc = AnalysisDocument.objects.create(
            analysis_doc_title="Empty Doc",
            section=self.section
        )
        df = preprocess_data(empty_doc)
        self.assertTrue(df.empty)
        self.assertIsInstance(df, pd.DataFrame)

    def test_preprocess_data_missing_topic_mapping(self):
        """Test that preprocess_data handles missing topic mappings with defaults."""
        FormativeAssessmentScore.objects.create(
            analysis_document=self.analysis_doc,
            student_id=self.student,
            score=70,
            test_number="3",
            topic_mapping=None
        )
        
        df = preprocess_data(self.analysis_doc)
        score3 = df[df["test_number"] == 3].iloc[0]
        self.assertEqual(score3["max_score"], 100.0) # Default value
        self.assertEqual(score3["normalized_scores"], 70/100.0)