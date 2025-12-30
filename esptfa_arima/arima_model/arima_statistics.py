import pandas as pd
import numpy as np
import logging
from django.db import transaction
from django.db.models import Count, Sum, Avg, StdDev, Min, Max
from Test_Management.models import AnalysisDocumentStatistic, FormativeAssessmentStatistic, StudentScoresStatistic, TestTopicMapping, Student, PredictedScore

logger = logging.getLogger("arima_model")

def compute_document_statistics(processed_data, analysis_document):
    # get the necessary statistics for the analysis document
    # e.g., mean, median, standard deviation

    scores = processed_data["score"]

    # compute for mean using pandas
    mean = scores.mean()

    # compute for median
    median = scores.median()

    # compute for standard deviation
    standard_deviation = scores.std()
    if np.isnan(standard_deviation):
        standard_deviation = 0.0

    # compute for minimum
    minimum = scores.min()

    # compute for maximum
    maximum = scores.max()

    # Compute mode (handling cases where multiple modes exist)
    mode_series = scores.mode()
    mode_value = mode_series[0] if not mode_series.empty else None

    # total students in the document
    total_students = processed_data["student_id"].nunique()

    # mean passing threshold
    passing_threshold = 0.75 * processed_data["max_score"].mean()

    # save statistics

    analysis_document_statistic, _ = AnalysisDocumentStatistic.objects.update_or_create(
        analysis_document=analysis_document,
        defaults={
            "mean": mean,
            "median": median,
            "standard_deviation": standard_deviation,
            "minimum": minimum,
            "maximum": maximum,
            "mode": mode_value,
            "total_students": total_students,
            "mean_passing_threshold": passing_threshold
        }
    )

    return analysis_document_statistic


def compute_test_statistics(processed_data, analysis_document):
    # group by test number
    for fa_number, fa_data in processed_data.groupby("test_number"):

        # compute for mean using pandas
        scores = fa_data["score"]
        max_score = fa_data["max_score"].iloc[0]
        passing_threshold = 0.75 * max_score
        total_scores = scores.count()
        mean = scores.mean()
        median = scores.median()
        mode_series = scores.mode()
        mode_value = mode_series[0] if not mode_series.empty else None

        # check if std is NaN due to single test scores
        standard_deviation = scores.std()
        if np.isnan(standard_deviation):
            standard_deviation = 0.0

        minimum = scores.min()
        maximum = scores.max()
        passing_scores = len(scores[scores >= passing_threshold])
        passing_rate = (passing_scores / total_scores) * 100
        failing_rate = (total_scores - passing_scores) / total_scores * 100

        mapping = TestTopicMapping.objects.filter(
            analysis_document=analysis_document, 
            topic__test_number=str(fa_number)
        ).first()
        fa_topic = mapping.topic if mapping else None
        
        # commit to db
        with transaction.atomic():
            _, _ = FormativeAssessmentStatistic.objects.update_or_create(
                analysis_document=analysis_document,
                formative_assessment_number=str(fa_number),
                fa_topic=fa_topic,
                defaults={
                    "mean": mean,
                    "median": median,
                    "mode": mode_value,
                    "standard_deviation": standard_deviation,
                    "minimum": minimum,
                    "maximum": maximum,
                    "passing_rate": passing_rate,
                    "failing_rate": failing_rate,
                    "passing_threshold": passing_threshold,
                    "max_score": max_score
                }
            )
            


def compute_student_statistics(processed_data, analysis_document):
    # group by student id

    for student_id, student_data in processed_data.groupby("student_id"):
        # get student instance
        student = Student.objects.get(lrn=student_id)
        scores = student_data["score"]
        normalized_scores = student_data["normalized_scores"]
        normalized_passing_threshold = student_data["normalized_passing_threshold"]
        total_scores = scores.count()
        mean = scores.mean()
        median = scores.median()
        mode_series = scores.mode()
        mode_value = mode_series[0] if not mode_series.empty else None

        # check if std is NaN due to single test scores
        standard_deviation = scores.std()
        if np.isnan(standard_deviation):
            standard_deviation = 0.0

        minimum = scores.min()
        maximum = scores.max()
        passing_scores = (normalized_scores >= normalized_passing_threshold).sum() 
        passing_rate = (passing_scores / total_scores) * 100
        failing_rate = (total_scores - passing_scores) / total_scores * 100

        # commit to db
        with transaction.atomic():
            _, _ = StudentScoresStatistic.objects.update_or_create(
                analysis_document=analysis_document,
                student=student,
                defaults={
                    "mean": mean,
                    "median": median,
                    "mode": mode_value,
                    "standard_deviation": standard_deviation,
                    "minimum": minimum,
                    "maximum": maximum,
                    "passing_rate": passing_rate,
                    "failing_rate": failing_rate
                }
            )
            




