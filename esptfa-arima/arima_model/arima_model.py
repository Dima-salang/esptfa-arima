from itertools import product
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error
import tensorflow as tf
from keras.api.models import Sequential
from keras.api.layers import LSTM, Dense, Dropout, Bidirectional, Input
from django.db import transaction
from Test_Management.models import Student, FormativeAssessmentScore, PredictedScore
import logging
import traceback

logger = logging.getLogger("arima_model")

arima_results = []
lstm_model = None  # Global LSTM model
window_size = 5  # Number of past scores to use for LSTM predictions


def preprocess_data(csv_file, analysis_document):
    test_data = pd.read_csv(csv_file)

    # Define test dates (assuming weekly tests)
    num_tests = test_data.shape[1] - 4  # Exclude student_id, name, section
    test_dates = pd.date_range(
        start=analysis_document.test_start_date, periods=num_tests, freq="7D")

    # Reshape from wide to long format
    test_data_long = test_data.melt(id_vars=["student_id", "first_name", "last_name", "section"],
                                    var_name="test",
                                    value_name="score")

    # Extract test number & assign correct dates
    test_data_long["test_number"] = test_data_long["test"].str.extract(
        "(\d+)").astype(int)
    test_data_long["date"] = test_data_long["test_number"].apply(
        lambda x: test_dates[x - 1])
    
    # Drop old test column
    test_data_long.drop(columns=["test"], inplace=True)

    # Handling missing values
    test_data_long["score"].fillna(
        test_data_long["score"].mean())
    

    print(f"Preprocessed data: {test_data_long}")

    return test_data_long


def make_stationary(student_data):
    student_data = student_data.sort_values("date").copy()
    student_data["score_diff"] = student_data["score"].diff()
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
        scores = student_data.sort_values("date")["score"].tolist()
        all_scores.extend(scores)  # Collect all scores

    # Convert data into sequences
    X_train, y_train = prepare_lstm_data(all_scores, window_size)
    X_train = X_train.reshape(
        (X_train.shape[0], X_train.shape[1], 1))  # Reshape for LSTM

    # Build and train the LSTM model
    lstm_model = build_lstm_model(window_size)
    lstm_model.fit(X_train, y_train, epochs=50, batch_size=16)


def hybrid_prediction(student_scores):
    """ Generates a hybrid prediction using both ARIMA and LSTM. """
    global lstm_model

    # Use ARIMA for baseline prediction
    arima_model = train_arima(student_scores)
    arima_pred = arima_model.forecast(steps=1)[0]
    

    # Use LSTM for refinement
    X_input = np.array(
        student_scores[-window_size:]).reshape(1, window_size, 1)
    lstm_pred = lstm_model.predict(X_input)[0][0]

    # Hybrid prediction: Combine both models
    final_pred = (0.6 * arima_pred) + (0.4 * lstm_pred)
    return final_pred


def train_arima(train_series):
    """ Trains an ARIMA model for a given student's time series. """
    model = ARIMA(train_series, order=(1, 1, 1))
    model_fit = model.fit()
    return model_fit


def train_model(processed_data, analysis_document):
    """ Trains ARIMA for each student and applies the hybrid approach. """

    first_fa_number = processed_data["test_number"].iloc[0]

    p_values = range(0, 2)
    d_values = [1]  # Differencing is manually applied, so d=1
    q_values = range(0, 2)

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
        logger.info(f"Student data after differencing: {differenced_student_data}")
        num_tests = differenced_student_data.shape[0]
        logger.info(f"Number of tests: {num_tests}")

        train = differenced_student_data.iloc[:num_tests-1].copy()
        test = differenced_student_data.iloc[num_tests-1:].copy()

        logger.info(f"Train data: {train}")
        logger.info(f"Test data: {test}")

        train.set_index("date", inplace=True)
        test.set_index("date", inplace=True)

        best_order, best_model = grid_search_arima(
            train["score_diff"])

        if best_order:
            diff_predictions = best_model.forecast(steps=test.shape[0])
            last_train_score = train["score"].iloc[-1]
            predictions = np.cumsum(diff_predictions) + last_train_score

            # Hybrid prediction
            hybrid_predictions = [hybrid_prediction(
                differenced_student_data["score"].tolist())]

            mae_arima = mean_absolute_error(test["score"], predictions)
            mae_hybrid = mean_absolute_error(test["score"], hybrid_predictions)

            logger.info(f"ARIMA MAE: {mae_arima:.2f}, Hybrid MAE: {mae_hybrid:.2f}")

            with transaction.atomic():
                for i, (date, actual_score) in enumerate(zip(student_data["date"], student_data["score"])):
                    FormativeAssessmentScore.objects.update_or_create(
                        analysis_document=analysis_document,
                        student_id=student,
                        formative_assessment_number=str(first_fa_number + i),
                        date=date,
                        score=actual_score,
                    )

                last_fa_number = differenced_student_data["test_number"].iloc[-1]
                future_dates = pd.date_range(
                    start=test.index[-1] + pd.Timedelta(days=7), periods=len(hybrid_predictions), freq="7D")

                for i, (date, predicted_score) in enumerate(zip(future_dates, hybrid_predictions)):
                    PredictedScore.objects.update_or_create(
                        analysis_document=analysis_document,
                        student_id=student,
                        formative_assessment_number=str(
                            last_fa_number + i + 1),
                        date=date,
                        score=predicted_score,
                    )


def arima_driver(analysis_document):
    logger.info(f"Processing Analysis Document... {analysis_document.analysis_document_id} - {analysis_document.analysis_doc_title}")
    try:
        csv_path = analysis_document.analysis_doc.path
        processed_data = preprocess_data(csv_path, analysis_document)

        train_lstm_model(processed_data)  # Train LSTM first
        train_model(processed_data, analysis_document)
    except Exception as e:
        logger.error(f"Error processing analysis document {analysis_document.analysis_document_id}: {str(e)}")
        logger.error(traceback.format_exc())
