from django.test import TestCase
from django.contrib.auth.models import User
from Authentication.models import Student
from Test_Management.models import (
    AnalysisDocument, Subject, Quarter, Section, 
    TestTopic, TestTopicMapping, AnalysisDocumentStatistic,
    FormativeAssessmentStatistic, StudentScoresStatistic
)
from arima_model.arima_statistics import (
    compute_document_statistics, 
    compute_test_statistics, 
    compute_student_statistics
)
import pandas as pd
import numpy as np

class ArimaStatisticsTests(TestCase):
    def setUp(self):
        # Setup common data
        self.user = User.objects.create_user(username="teacher_stats", password="password")
        self.section = Section.objects.create(section_name="Section Stats")
        self.subject = Subject.objects.create(subject_name="Math Stats")
        self.quarter = Quarter.objects.create(quarter_name="1st Quarter")
        
        self.analysis_doc = AnalysisDocument.objects.create(
            analysis_doc_title="Stats Test Doc",
            teacher=self.user,
            section=self.section,
            subject=self.subject,
            quarter=self.quarter
        )
        
        # Create students
        self.student1 = Student.objects.create(
            lrn="10000000001",
            user_id=User.objects.create_user(username="s1", first_name="S", last_name="One"),
            section=self.section
        )
        self.student2 = Student.objects.create(
            lrn="10000000002",
            user_id=User.objects.create_user(username="s2", first_name="S", last_name="Two"),
            section=self.section
        )
        
        # Create topics/mappings
        self.topic1 = TestTopic.objects.create(topic_name="Topic 1", max_score=100, subject=self.subject, test_number="1")
        TestTopicMapping.objects.create(analysis_document=self.analysis_doc, topic=self.topic1)
        
        self.topic2 = TestTopic.objects.create(topic_name="Topic 2", max_score=50, subject=self.subject, test_number="2")
        TestTopicMapping.objects.create(analysis_document=self.analysis_doc, topic=self.topic2)

        # Sample processed data
        self.processed_data = pd.DataFrame([
            {"student_id": "10000000001", "test_number": 1, "score": 80.0, "max_score": 100.0, "normalized_scores": 0.8, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000001", "test_number": 2, "score": 40.0, "max_score": 50.0, "normalized_scores": 0.8, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000002", "test_number": 1, "score": 60.0, "max_score": 100.0, "normalized_scores": 0.6, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000002", "test_number": 2, "score": 30.0, "max_score": 50.0, "normalized_scores": 0.6, "normalized_passing_threshold": 0.75},
        ])

    def test_compute_document_statistics(self):
        """Test general document-wide statistics computation."""
        stat = compute_document_statistics(self.processed_data, self.analysis_doc)
        
        # Mean of [80, 40, 60, 30] = 210 / 4 = 52.5
        self.assertEqual(stat.mean, 52.5)
        # Median of [30, 40, 60, 80] = (40+60)/2 = 50.0
        self.assertEqual(stat.median, 50.0)
        self.assertEqual(stat.minimum, 30.0)
        self.assertEqual(stat.maximum, 80.0)
        self.assertEqual(stat.total_students, 2)
        # Mean passing threshold = 0.75 * mean([100, 50, 100, 50]) = 0.75 * 75 = 56.25
        self.assertEqual(stat.mean_passing_threshold, 56.25)
        
        # Verify it's in DB
        self.assertTrue(AnalysisDocumentStatistic.objects.filter(analysis_document=self.analysis_doc).exists())

    def test_compute_test_statistics(self):
        """Test statistics computation for each formative assessment (test number)."""
        compute_test_statistics(self.processed_data, self.analysis_doc)
        
        # Check for test 1
        stat1 = FormativeAssessmentStatistic.objects.get(analysis_document=self.analysis_doc, formative_assessment_number="1")
        # Scores: [80, 60], Mean: 70, Max: 100, Passing: 75
        self.assertEqual(stat1.mean, 70.0)
        self.assertEqual(stat1.max_score, 100.0)
        self.assertEqual(stat1.passing_threshold, 75.0)
        # Passing: [80] (1 student), Total: 2 -> 50%
        self.assertEqual(stat1.passing_rate, 50.0)
        self.assertEqual(stat1.failing_rate, 50.0)
        self.assertEqual(stat1.fa_topic, self.topic1)

        # Check for test 2
        stat2 = FormativeAssessmentStatistic.objects.get(analysis_document=self.analysis_doc, formative_assessment_number="2")
        # Scores: [40, 30], Mean: 35, Max: 50, Passing: 37.5
        self.assertEqual(stat2.mean, 35.0)
        self.assertEqual(stat2.passing_threshold, 37.5)
        # Passing: [40] (1 student), Total: 2 -> 50%
        self.assertEqual(stat2.passing_rate, 50.0)

    def test_compute_student_statistics(self):
        """Test statistics computation for each student."""
        compute_student_statistics(self.processed_data, self.analysis_doc)
        
        # Check student 1
        stat1 = StudentScoresStatistic.objects.get(analysis_document=self.analysis_doc, student=self.student1)
        # Scores: [80, 40], Mean: 60
        self.assertEqual(stat1.mean, 60.0)
        # Normalized: [0.8, 0.8], Threshold: 0.75 -> both passing -> 100%
        self.assertEqual(stat1.passing_rate, 100.0)
        self.assertEqual(stat1.failing_rate, 0.0)

        # Check student 2
        stat2 = StudentScoresStatistic.objects.get(analysis_document=self.analysis_doc, student=self.student2)
        # Scores: [60, 30], Mean: 45
        # Normalized: [0.6, 0.6], Threshold: 0.75 -> both failing -> 0%
        self.assertEqual(stat2.passing_rate, 0.0)
        self.assertEqual(stat2.failing_rate, 100.0)

    def test_single_data_point_std(self):
        """Test that standard deviation is handled correctly for single data points."""
        single_data = pd.DataFrame([
            {"student_id": "10000000001", "test_number": 1, "score": 80.0, "max_score": 100.0, "normalized_scores": 0.8, "normalized_passing_threshold": 0.75}
        ])
        
        # Test document stats
        doc_stat = compute_document_statistics(single_data, self.analysis_doc)
        self.assertEqual(doc_stat.standard_deviation, 0.0)
        
        # Test student stats
        compute_student_statistics(single_data, self.analysis_doc)
        stud_stat = StudentScoresStatistic.objects.get(student=self.student1)
        self.assertEqual(stud_stat.standard_deviation, 0.0)

    def test_missing_student_handling(self):
        """Test how it handles students not present in the database."""
        missing_data = pd.DataFrame([
            {"student_id": "99999999999", "test_number": 1, "score": 80.0, "max_score": 100.0, "normalized_scores": 0.8, "normalized_passing_threshold": 0.75}
        ])
        
        # This currently should raise Student.DoesNotExist based on arima_statistics.py:120
        with self.assertRaises(Student.DoesNotExist):
            compute_student_statistics(missing_data, self.analysis_doc)

    def test_multiple_modes(self):
        """Test that the first mode is picked when multiple modes exist."""
        # Scores: [10, 10, 20, 20, 30] -> Modes are 10 and 20.
        multi_mode_data = pd.DataFrame([
            {"student_id": "10000000001", "test_number": 1, "score": 10.0, "max_score": 100.0, "normalized_scores": 0.1, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000001", "test_number": 2, "score": 10.0, "max_score": 100.0, "normalized_scores": 0.1, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000001", "test_number": 3, "score": 20.0, "max_score": 100.0, "normalized_scores": 0.2, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000001", "test_number": 4, "score": 20.0, "max_score": 100.0, "normalized_scores": 0.2, "normalized_passing_threshold": 0.75},
            {"student_id": "10000000001", "test_number": 5, "score": 30.0, "max_score": 100.0, "normalized_scores": 0.3, "normalized_passing_threshold": 0.75},
        ])
        
        stat = compute_document_statistics(multi_mode_data, self.analysis_doc)
        # pandas .mode() returns sorted values, so 10.0 should be index 0
        self.assertEqual(stat.mode, 10.0)
