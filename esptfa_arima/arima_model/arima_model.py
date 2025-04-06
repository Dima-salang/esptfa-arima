from itertools import product
import pandas as pd
import numpy as np
import math
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error
import tensorflow as tf
from keras.api.models import Sequential
from keras.api.layers import LSTM, Dense, Dropout, Bidirectional, Input
from django.db import transaction
from django.db.models import Avg
from Test_Management.models import Student, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, FormativeAssessmentStatistic, StudentScoresStatistic, TestTopicMapping
import logging
import traceback
import re
from scipy.stats import mode



logger = logging.getLogger("arima_model")

arima_results = []
lstm_model = None  # Global LSTM model
window_size = 5  # Number of past scores to use for LSTM predictions


def preprocess_data(csv_file, analysis_document):
    test_data = pd.read_csv(csv_file)

    # Identify columns with test scores (e.g., "fa1:30", "fa2:20")
    test_columns = [col for col in test_data.columns if "fa" in col]

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

    print(f"Preprocessed data: {test_data_long}")

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


def prepare_lstm_data(data, window_size):
    """ Converts the dataset into sequences for LSTM training. """
    X, y = [], []
    for i in range(len(data) - window_size):
        X.append(data[i:i+window_size])
        y.append(data[i+window_size])
    return np.array(X), np.array(y)


def build_lstm_model(window_size):
    """ Builds and compiles an LSTM model. """
    model = Sequential([
        Input(shape=(window_size, 1)),
        Bidirectional(LSTM(64, activation="tanh", return_sequences=True)),
        Dropout(0.2),
        Bidirectional(LSTM(32, activation="tanh")),
        Dense(16, activation="relu"),
        Dense(1)  # Predicts one score
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def train_lstm_model(processed_data):
    """ Trains a single LSTM model across all students. """
    global lstm_model

    # Prepare data for LSTM training
    all_scores = []
    for _, student_data in processed_data.groupby("student_id"):
        normalized_diff_scores = make_stationary(student_data.copy())
        scores = normalized_diff_scores.sort_values(
            "date")["normalized_score_diff"].tolist()
        all_scores.extend(scores)  # Collect all scores

    # Convert data into sequences
    X_train, y_train = prepare_lstm_data(all_scores, window_size)
    X_train = X_train.reshape(
        (X_train.shape[0], X_train.shape[1], 1))  # Reshape for LSTM

    # Build and train the LSTM model
    lstm_model = build_lstm_model(window_size)
    lstm_model.fit(X_train, y_train, epochs=50, batch_size=16)


def hybrid_prediction(student_scores, arima_model, last_normalized_score, last_max_score):
    """ Generates a hybrid prediction using both ARIMA and LSTM. """
    global lstm_model

    arima_pred = arima_prediction(arima_model=arima_model, student_scores=student_scores,
                                  last_normalized_score=last_normalized_score, last_max_score=last_max_score)

    # Use LSTM for refinement
    X_input = np.array(
        student_scores[-window_size:]).reshape(1, window_size, 1)
    lstm_pred = lstm_model.predict(X_input)[0][0]

    # reverse difference the lstm_pred
    lstm_pred_normalized = lstm_pred + last_normalized_score

    # reverse normalization
    lstm_pred = lstm_pred_normalized * last_max_score

    # Hybrid prediction: Combine both models
    hybrid_prediction = (arima_pred * 0.5) + (lstm_pred * 0.5)

    return hybrid_prediction


def train_arima(train_series):
    """ Trains an ARIMA model for a given student's time series. """
    model = ARIMA(train_series, order=(1, 1, 1))
    model_fit = model.fit()
    return model_fit


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
        logger.info(
            f"Student data after differencing: {differenced_student_data}")
        num_tests = differenced_student_data.shape[0]
        logger.info(f"Number of tests: {num_tests}")

        train = differenced_student_data.iloc[:num_tests-1].copy()
        test = differenced_student_data.iloc[num_tests-1:].copy()

        logger.info(f"Train data: {train}")
        logger.info(f"Test data: {test}")

        train.set_index("date", inplace=True)
        test.set_index("date", inplace=True)

        best_order, best_model = grid_search_arima(
            train["normalized_score_diff"])

        if best_order:
            last_max_score = train["max_score"].iloc[-1]
            # Base ARIMA Prediction
            arima_predictions = [arima_prediction(
                best_model, train["normalized_score_diff"], train["normalized_scores"].iloc[-1], last_max_score)]

            # Hybrid prediction
            hybrid_predictions = [hybrid_prediction(
                train["normalized_score_diff"], best_model, train["normalized_scores"].iloc[-1], last_max_score)]

            mae_arima = mean_absolute_error(test["score"], arima_predictions)
            mae_hybrid = mean_absolute_error(test["score"], hybrid_predictions)

            # determine whether the mae_arima is better than mae_hybrid and then use that as the predicted score
            if mae_arima < mae_hybrid:
                best_prediction = arima_predictions
            else:
                best_prediction = hybrid_predictions

            logger.info(
                f"ARIMA MAE: {mae_arima:.2f}, Hybrid MAE: {mae_hybrid:.2f}")

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
                    start=test.index[-1] + pd.Timedelta(days=7), periods=len(hybrid_predictions), freq="7D")



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
                        passing_threshold=passing_threshold
                    )

# function for computing necessary statistics


def compute_document_statistics(processed_data, analysis_document, passing_threshold=75, at_risk_threshold=74):
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
    analysis_document = AnalysisDocumentStatistic.objects.update_or_create(
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

    return analysis_document

def compute_test_statistics(processed_data, analysis_document, passing_threshold=75, at_risk_threshold=74):
    logger.info(f"Processing test statistics... Processed data: {processed_data}")
    # group by test number
    for fa_number, fa_data in processed_data.groupby("test_number"):
        
        # compute for mean using pandas
        scores = fa_data["score"]
        passing_threshold = 0.75 * fa_data["max_score"].iloc[0]
        logger.info(f"FA Number: {fa_number}, FA Scores: {scores}")
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
        failing_scores = len(scores[scores < passing_threshold])
        passing_rate = (passing_scores / total_scores) * 100
        failing_rate = (total_scores - passing_scores) / total_scores * 100

        fa_topic = TestTopicMapping.objects.filter(
            analysis_document=analysis_document, test_number=fa_number).first().topic

        # commit to db
        with transaction.atomic():

            FormativeAssessmentStatistic.objects.update_or_create(
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
                    "passing_threshold": passing_threshold
                } 
            )


def compute_student_statistics(processed_data, analysis_document, passing_threshold=75, at_risk_threshold=74):
    logger.info(
        f"Processing student statistics... Processed data: {processed_data}")
    # group by student id
    for student_id, student_data in processed_data.groupby("student_id"):
        # get student instance
        passing_threshold = 0.75 * student_data["max_score"].iloc[0]
        student = Student.objects.get(student_id=student_id)
        scores = student_data["score"]
        logger.info(f"Student ID: {student_id}, Scores: {scores}")
        total_scores = len(scores)
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
        failing_scores = len(scores[scores < passing_threshold])
        passing_rate = (passing_scores / total_scores) * 100
        failing_rate = (total_scores - passing_scores) / total_scores * 100

        # commit to db
        with transaction.atomic():

            StudentScoresStatistic.objects.update_or_create(
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

def arima_driver(analysis_document):
    """ Driver function for the ARIMA model prediction. Starts the process of predicting scores for students."""
    logger.info("Starting new analysis...")
    logger.info(
        f"Processing Analysis Document... {analysis_document.analysis_document_id} - {analysis_document.analysis_doc_title}")
    try:
        csv_path = analysis_document.analysis_doc.path
        processed_data = preprocess_data(csv_path, analysis_document)

        train_lstm_model(processed_data)  # Train LSTM first
        train_model(processed_data, analysis_document)
        compute_document_statistics(processed_data, analysis_document)
        compute_test_statistics(processed_data, analysis_document)
        compute_student_statistics(processed_data, analysis_document)
    except Exception as e:
        logger.error(
            f"Error processing analysis document {analysis_document.analysis_document_id}: {str(e)}")
        logger.error(traceback.format_exc())
