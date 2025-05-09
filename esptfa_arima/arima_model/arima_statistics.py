import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import seaborn as sns
import logging
import io
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count, Sum, Avg, StdDev, Min, Max
from Test_Management.models import AnalysisDocumentStatistic, FormativeAssessmentStatistic, StudentScoresStatistic, TestTopicMapping, Student, PredictedScore

logger = logging.getLogger("arima_model")

def compute_document_statistics(processed_data, analysis_document, passing_threshold=75):
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

    # Save the heatmap image to the model
    heatmap_image = generate_heatmap(processed_data, "normalized_scores", title="Heatmap of Normalized Scores of Students per FA")
    filename = f"heatmap_{analysis_document.pk}.png"


    # save statistics
    analysis_document_statistic, created = AnalysisDocumentStatistic.objects.update_or_create(
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

    # Save the heatmap to the model
    analysis_document_statistic.heatmap.save(
        filename, ContentFile(heatmap_image.read()), save=True)

    return analysis_document_statistic





def compute_test_statistics(processed_data, analysis_document, passing_threshold=75):
    logger.info(
        f"Processing test statistics... for analysis document {analysis_document.pk}...")
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

        fa_topic = TestTopicMapping.objects.filter(
            analysis_document=analysis_document, test_number=fa_number).first().topic
        



        # commit to db
        with transaction.atomic():

            fa_statistic, created = FormativeAssessmentStatistic.objects.update_or_create(
                analysis_document=analysis_document,
                formative_assessment_number=fa_number,
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
    logger.info(
        f"Processing student statistics for analysis document {analysis_document.pk}...")
    # group by student id

    # TO-DO: USE NORMALIZED THRESHOLD TO CALCULATE FOR PASSING RATE AND PASSING SCORES
    for student_id, student_data in processed_data.groupby("student_id"):
        # get student instance
        student = Student.objects.get(student_id=student_id)
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

            student_statistic, created = StudentScoresStatistic.objects.update_or_create(
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





def generate_score_dist_chart(fa_data, fa_number):
    fig, ax = plt.subplots()
    ax.hist(fa_data["score"], bins=10, edgecolor='black')
    ax.set_title(f"Score Distribution for FA Number {fa_number}")
    ax.set_xlabel("Score")
    ax.set_ylabel("Frequency")
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer

def generate_scatterplot(fa_data, fa_number):
    fig, ax = plt.subplots()
    ax.scatter(fa_data["student_id"], fa_data["score"])
    ax.set_title(f"Score Scatter Plot for FA Number {fa_number}")
    ax.set_xlabel("Student ID")
    ax.set_ylabel("Score")
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer

def generate_boxplot(fa_data, fa_number):
    fig, ax = plt.subplots()
    sns.boxplot(x=fa_data["score"], ax=ax)
    ax.set_title(f"Score Box Plot for FA Number {fa_number}")
    ax.set_xlabel("Score")
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer

def generate_bar_chart(fa_data, fa_number):
    fig, ax = plt.subplots()
    sns.barplot(x=fa_data["student_id"], y=fa_data["score"], ax=ax)
    ax.set_title(f"Score Bar Chart for FA Number {fa_number}")
    ax.set_xlabel("Student ID")
    ax.set_ylabel("Score")
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer


def generate_heatmap(processed_data, value_column, title=None):
    """
        Plots and returns a heatmap image (as BytesIO) where rows are students, columns are test numbers, and cells are the specified value.
        """
    heatmap_data = processed_data.pivot_table(
        index="student_id",
        columns="test_number",
        values=value_column
    )



    fig, ax = plt.subplots(figsize=(12, 8))  # set fig size


    sns.heatmap(heatmap_data, annot=True, fmt=".1f",
                cmap="YlGnBu", linewidths=0.5, ax=ax)

    ax.set_title(title)
    ax.set_xlabel("Formative Assessment Number")
    ax.set_ylabel("Student ID")
    plt.tight_layout()

    # Save the plot to a BytesIO buffer instead of showing it
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png', bbox_inches='tight')
    plt.close(fig)
    buffer.seek(0)
    return buffer


def generate_student_line_chart(student_data, analysis_document):
    fig, ax = plt.subplots()

    student_id = student_data["student_id"].iloc[0]
    # get the predicted score
    predicted_score = PredictedScore.objects.filter(student_id=student_id, analysis_document=analysis_document).first()

    # Check if predicted_score exists
    if predicted_score:
        predicted_test_numbers = [int(predicted_score.formative_assessment_number)]
        # assuming 'predicted_value' holds the predicted score
        predicted_scores = [predicted_score.score]

        # Overlay: Actual scores
        sns.lineplot(x=student_data["test_number"].astype(int), y=student_data["score"],
                     label="Actual Score", marker="o", color="blue", ax=ax)

        # Overlay: Predicted scores (same X but with single Y value, repeated for each test number)
        sns.lineplot(x=predicted_test_numbers, y=predicted_scores,
                     label="Predicted Score", marker="o", color="orange", ax=ax)

    else:
        # If no predicted score found, just plot the actual scores
        sns.lineplot(x=student_data["test_number"].astype(int), y=student_data["score"],
                     label="Actual Score", marker="o", color="blue", ax=ax)
    
    ax.set_title(f"Actual vs Predicted Scores Over Time")
    ax.set_xlabel("FA Number")
    ax.set_ylabel("Score")
    ax.legend()
    ax.grid(True)
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer