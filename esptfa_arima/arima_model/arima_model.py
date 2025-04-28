from itertools import product
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error
from django.db import transaction
from django.db.models import Avg
from Test_Management.models import Student, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, FormativeAssessmentStatistic, StudentScoresStatistic, TestTopicMapping
import logging
import traceback
import re
from scipy.stats import mode
from .arima_statistics import compute_document_statistics, compute_test_statistics, compute_student_statistics



logger = logging.getLogger("arima_model")

arima_results = []
lstm_model = None  # Global LSTM model
window_size = 5  # Number of past scores to use for LSTM predictions


def preprocess_data(analysis_document):
    test_data = pd.read_csv(analysis_document.analysis_doc.path)

    test_data.columns = test_data.columns.str.lower()
    num_of_students = test_data["student_id"].nunique()
    logger.info(f"Number of students: {num_of_students}")

    # convert student_id into str col
    test_data["student_id"] = test_data["student_id"].astype(str)

    # Identify columns with test scores (e.g., "fa1:30", "fa2:20")
    test_columns = [col for col in test_data.columns if col.startswith("fa")]

    # Extract test numbers and max scores from column names
    test_info = []
    for col in test_columns:
        match = re.match(r"fa(\d+):(\d+)", col)
        if match:
            test_number, max_score = match.groups()
            test_info.append((col, int(test_number), int(max_score)))

    # Define test dates (assuming weekly tests)
    num_tests = test_data.shape[1] - 4  # Exclude student_id, name, section
    test_dates = pd.date_range(
        start=analysis_document.test_start_date, periods=num_tests, freq="7D")

    # Reshape from wide to long format
    test_data_long = test_data.melt(id_vars=["student_id", "first_name", "last_name", "section"],
                                    var_name="test",
                                    value_vars=[col for col,
                                                _, _ in test_info],
                                    value_name="score")
                                

    # Extract test number & assign correct dates
    # Extract test number and assign corresponding max score
    # Convert test number using the pre-extracted data from test_info
    test_data_long["test_number"] = test_data_long["test"].map(
        {col: test_number for col, test_number, _ in test_info}
    )
    test_data_long["max_score"] = test_data_long["test"].apply(
        lambda x: next(max_score for col, _,
                       max_score in test_info if col == x)
    )
    test_data_long["date"] = test_data_long["test_number"].apply(
        lambda x: test_dates[x - 1])

    # Drop old test column
    test_data_long.drop(columns=["test"], inplace=True)

    # Handling missing values
    test_data_long["score"].fillna(
        test_data_long["score"].mean())

    # normalize test scores
    test_data_long["normalized_scores"] = test_data_long["score"] / \
        test_data_long["max_score"]
    
    # normalize passing threshold
    test_data_long["normalized_passing_threshold"] = test_data_long["max_score"] * 0.75 / test_data_long["max_score"]

    # make test number into int
    test_data_long["test_number"] = test_data_long["test_number"].astype(int)

    return test_data_long


def make_stationary(student_data):
    student_data = student_data.sort_values("date").copy()
    student_data["score_diff"] = student_data["score"].diff()
    student_data["normalized_score_diff"] = student_data["normalized_scores"].diff()
    student_data.dropna(inplace=True)
    return student_data


def grid_search_arima(train_series):
    p_values = range(0, 2)
    d_values = [1]  # Differencing is manually applied, so d=1
    q_values = range(0, 2)

    best_aic = float("inf")
    best_order = None
    best_model = None

    for p, d, q in product(p_values, d_values, q_values):
        try:
            model = ARIMA(train_series, order=(p, d, q), freq="7D")
            fitted_model = model.fit()
            if fitted_model.aic < best_aic:
                best_aic = fitted_model.aic
                best_order = (p, d, q)
                best_model = fitted_model
        except:
            continue

    return best_order, best_model




def arima_prediction(arima_model, student_scores, last_normalized_score, last_max_score):
    """ Generates an ARIMA prediction for a given student's time series. """

    arima_pred = arima_model.forecast(steps=1)[0]

    # reverse differencing
    predicted_normalized_score = arima_pred + last_normalized_score

    # reverse normalization
    predicted_score = predicted_normalized_score * last_max_score

    return predicted_score


def train_model(processed_data, analysis_document):
    """ Trains ARIMA for each student and applies the hybrid approach. """

    first_fa_number = processed_data["test_number"].iloc[0]

    for student_id, student_data in processed_data.groupby("student_id"):
        logger.info(f"Processing Student {student_id}...")
        logger.info(f"Student Data: {student_data}")

        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            student = Student.objects.create(
                student_id=student_id,
                first_name=student_data["first_name"].iloc[0],
                last_name=student_data["last_name"].iloc[0],
                section=student_data["section"].iloc[0]
            )

        differenced_student_data = make_stationary(student_data.copy())

        train = differenced_student_data.copy()


        train.set_index("date", inplace=True)

        best_order, best_model = grid_search_arima(
            train["normalized_score_diff"])

        if best_order:
            last_max_score = train["max_score"].iloc[-1]
            # Base ARIMA Prediction
            arima_predictions = [arima_prediction(
                best_model, train["normalized_score_diff"], train["normalized_scores"].iloc[-1], last_max_score)]


            # calculate the nearest prediction from the last test score
            mae_arima = mean_absolute_error([train["score"].iloc[-1]], arima_predictions)

            # determine whether the mae_arima is better than mae_hybrid and then use that as the predicted score
            best_prediction = arima_predictions[0]

            with transaction.atomic():
                for i, (date, actual_score, max_score) in enumerate(zip(student_data["date"], student_data["score"], student_data["max_score"])):
                    passing_threshold = 0.75 * max_score
                    FormativeAssessmentScore.objects.update_or_create(
                        analysis_document=analysis_document,
                        student_id=student,
                        formative_assessment_number=str(first_fa_number + i),
                        date=date,
                        score=actual_score,
                        passing_threshold=passing_threshold
                    )

                last_fa_number = differenced_student_data["test_number"].iloc[-1]
                future_dates = pd.date_range(
                    start=train.index[-1] + pd.Timedelta(days=7), periods=len(arima_predictions), freq="7D")


                for i, (date, predicted_score) in enumerate(zip(future_dates, best_prediction)):
                    
                    # calculate for the predicted score status
                    passing_threshold = 0.75 * last_max_score
                    if predicted_score >= passing_threshold:
                        predicted_status = "pass"
                    else:
                        predicted_status = "fail"

                    PredictedScore.objects.update_or_create(
                        analysis_document=analysis_document,
                        student_id=student,
                        formative_assessment_number=str(
                            last_fa_number + i + 1),
                        date=date,
                        score=predicted_score,
                        predicted_status=predicted_status,
                        passing_threshold=passing_threshold,
                        max_score=last_max_score
                    )

# function for computing necessary statistics


def arima_driver(analysis_document):
    """ Driver function for the ARIMA model prediction. Starts the process of predicting scores for students."""
    logger.info("Starting new analysis...")
    logger.info(
        f"Processing Analysis Document... {analysis_document.analysis_document_id} - {analysis_document.analysis_doc_title}")
    try:
        processed_data = preprocess_data(analysis_document)

        train_model(processed_data, analysis_document)
        compute_document_statistics(processed_data, analysis_document)
        compute_test_statistics(processed_data, analysis_document)
        compute_student_statistics(processed_data, analysis_document)

        # Update the status of the analysis document to True (processed)
        analysis_document.status = True
        analysis_document.save()
    except Exception as e:
        logger.error(
            f"Error processing analysis document {analysis_document.analysis_document_id}: {str(e)}")
        logger.error(traceback.format_exc())
        raise
