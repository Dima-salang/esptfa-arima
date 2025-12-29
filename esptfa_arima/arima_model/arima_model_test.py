from django.test import TestCase
from django.contrib.auth.models import User
from Authentication.models import Student
from Test_Management.models import (
    AnalysisDocument, Subject, Quarter, Section, 
    TestTopic, TestTopicMapping, FormativeAssessmentScore
)
from arima_model.arima_model import preprocess_data
import pandas as pd
import numpy as np

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
        df, features_df = preprocess_data(self.analysis_doc)
        
        self.assertIsInstance(df, pd.DataFrame)
        self.assertIsInstance(features_df, pd.DataFrame)
        self.assertEqual(len(df), 2)
        # One student, so one row in feature_df
        self.assertEqual(len(features_df), 1)
        
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
        df, _ = preprocess_data(self.analysis_doc)
        # Check if it's sorted by test_number (which indirectly implies date if created sequentially)
        self.assertTrue(list(df["test_number"]) == sorted(list(df["test_number"])))

    def test_preprocess_data_empty(self):
        """Test that preprocess_data handles documents with no scores gracefully."""
        # Create dummy doc with no scores
        empty_doc = AnalysisDocument.objects.create(
            analysis_doc_title="Empty Doc",
            section=self.section
        )
        with self.assertRaises(FormativeAssessmentScore.DoesNotExist):
            preprocess_data(empty_doc)

    def test_preprocess_data_missing_topic_mapping(self):
        """Test that preprocess_data handles missing topic mappings with defaults."""
        FormativeAssessmentScore.objects.create(
            analysis_document=self.analysis_doc,
            student_id=self.student,
            score=70,
            test_number="3",
            topic_mapping=None
        )
        
        df, _ = preprocess_data(self.analysis_doc)
        score3 = df[df["test_number"] == 3].iloc[0]
        self.assertEqual(score3["max_score"], 100.0) # Default value
        self.assertEqual(score3["normalized_scores"], 70/100.0)

from unittest.mock import patch, MagicMock
from arima_model.arima_model import assign_predicted_status, make_predictions, save_predictions
from Test_Management.models import PredictedScore

class ArimaModelPredictionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="teacher2", password="password")
        self.section = Section.objects.create(section_name="Section B")
        self.subject = Subject.objects.create(subject_name="Science")
        
        self.analysis_doc = AnalysisDocument.objects.create(
            analysis_doc_title="Prediction Doc",
            teacher=self.user,
            section=self.section,
            subject=self.subject,
            post_test_max_score=60.0
        )
        
        self.student = Student.objects.create(
            lrn="98765432109",
            user_id=User.objects.create_user(username="student2"),
            section=self.section
        )

        # Sample student data dataframe
        self.student_data = pd.DataFrame({
            "student_id": ["98765432109", "98765432109"],
            "test_number": [1, 2],
            "predictions": [0.8, 0.6],
            "post_test_max_score": [60.0, 60.0],
            "normalized_passing_threshold": [0.75, 0.75]
        })

    def test_assign_predicted_status(self):
        """Test that predicted status is correctly assigned based on thresholds."""
        df = assign_predicted_status(self.student_data.copy())
        
        # 0.8 * 60 = 48 >= 60 * 0.75 = 45 -> Pass
        self.assertEqual(df.iloc[0]["predicted_status"], "Pass")
        
        # 0.6 * 60 = 36 < 45 -> Fail
        self.assertEqual(df.iloc[1]["predicted_status"], "Fail")

    @patch("arima_model.arima_model.pickle.load")
    @patch("arima_model.arima_model.os.path.exists")
    @patch("builtins.open", new_callable=MagicMock)
    def test_make_predictions(self, mock_open, mock_exists, mock_pickle_load):
        """Test make_predictions correctly calls model and updates dataframe."""
        mock_exists.return_value = True
        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([0.9, 0.5])
        mock_pickle_load.return_value = mock_model
        
        features_df = pd.DataFrame({
            "student_id": ["98765432109", "98765432109"],
            "feature1": [1, 2]
        })
        
        # We need a fresh copy of student_data without the extra cols
        base_data = pd.DataFrame({
            "student_id": ["98765432109", "98765432109"],
            "normalized_passing_threshold": [0.75, 0.75]
        })
        
        result_df = make_predictions(base_data, features_df, self.analysis_doc)
        
        self.assertIn("predictions", result_df.columns)
        self.assertIn("post_test_max_score", result_df.columns)
        self.assertIn("predicted_status", result_df.columns)
        
        self.assertEqual(result_df.iloc[0]["predictions"], 0.9)
        self.assertEqual(result_df.iloc[1]["predictions"], 0.5)
        self.assertEqual(result_df.iloc[0]["predicted_status"], "Pass")
        self.assertEqual(result_df.iloc[1]["predicted_status"], "Fail")

    def test_save_predictions(self):
        """Test that predictions are correctly saved to the database."""
        # Add predicted_status to self.student_data as it's expected by save_predictions
        df = assign_predicted_status(self.student_data.copy())
        
        save_predictions(df, self.analysis_doc)
        
        saved_scores = PredictedScore.objects.filter(analysis_document=self.analysis_doc)
        self.assertEqual(saved_scores.count(), 2)
        
        score1 = saved_scores.get(test_number="1")
        self.assertEqual(score1.student_id, self.student)
        self.assertEqual(score1.score, 0.8)
        self.assertEqual(score1.predicted_status, "Pass")
        self.assertEqual(score1.max_score, 60.0)
        
        score2 = saved_scores.get(test_number="2")
        self.assertEqual(score2.score, 0.6)
        self.assertEqual(score2.predicted_status, "Fail")