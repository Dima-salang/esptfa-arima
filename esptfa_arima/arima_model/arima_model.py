from itertools import product
import pandas as pd
import numpy as np
import pickle
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error
from django.db import transaction
from django.db.models import Avg
from Test_Management.models import Student, FormativeAssessmentScore, PredictedScore, AnalysisDocumentStatistic, FormativeAssessmentStatistic, StudentScoresStatistic, TestTopicMapping
from typing import List
import logging
import traceback
import re
import os
from scipy.stats import mode
from .arima_statistics import compute_document_statistics, compute_test_statistics, compute_student_statistics


MASTERY_THRESHOLD = 0.90
PASSING_THRESHOLD = 0.75
DEFAULT_POST_TEST_MAX_SCORE = 60.0

logger = logging.getLogger("arima_model")

arima_results = []
lstm_model = None  # Global LSTM model
window_size = 5  # Number of past scores to use for LSTM predictions


def preprocess_data(analysis_document):
    """
    Preprocesses formative assessment scores from the database into a DataFrame suitable for ARIMA modeling.
    """
    # get the formative assessment scores from the db
    fa_scores = FormativeAssessmentScore.objects.filter(
        analysis_document=analysis_document
    ).select_related(
        "student_id",
        "student_id__section",
        "topic_mapping__topic"
    )

    if not fa_scores.exists():
        logger.warning(f"No formative assessment scores found for analysis document {analysis_document.pk}")
        raise FormativeAssessmentScore.DoesNotExist

    data = []
    for score in fa_scores:
        student = score.student_id
        topic = score.topic_mapping.topic if score.topic_mapping else None
        
        data.append({
            "student_id": student.lrn,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "section": student.section.section_name if student.section else "N/A",
            "test_number": int(score.test_number),
            "score": score.score,
            "max_score": topic.max_score if topic and topic.max_score else 100.0,
            "date": score.date,
        })
    
    df = pd.DataFrame(data)

    # Handling missing values
    df["score"] = df["score"].ffill().bfill().fillna(0) # Forward/backward fill or 0

    # normalize test scores
    df["normalized_scores"] = df["score"] / df["max_score"]
    
    # normalize passing threshold
    df["normalized_passing_threshold"] = 0.75

    # make test number into int
    df["test_number"] = df["test_number"].astype(int)

    # Sort by student and date for ARIMA processing
    df = df.sort_values(["student_id", "date"])


    # iterate over each student and transform into long format
    features_list = []
    for student_id, student_data in df.groupby("student_id"):
        scores = student_data["normalized_scores"]
        
        # calculate the weighted mean of the scores
        features_list.append({
            "student_id": student_id,
            "weighted_mean_score": weighted_mean_score(scores),
            "std_score": score_std(scores),
            "last_score": last_score(scores),
            "trend_slope": trend_slope(scores),
            "first_last_delta": first_last_delta(scores),
            "recent_trend_slope": recent_trend_slope(scores),
            "coefficient_of_variation": coefficient_of_variation(scores),
            "mastery_consistency": mastery_consistency(scores),
            "recent_decay": recent_decay(scores),
            "downside_risk": downside_risk(scores),
            "normalized_passing_threshold": 0.75, # adding this for predicted status
            "test_number": student_data["test_number"].max() # use the last test number as ref
        })
        
    feature_df = pd.DataFrame(features_list)

    return df, feature_df

def mean_score(scores):
    scores = np.asarray(scores)
    return float(np.mean(scores))

def weighted_mean_score(scores: List[float], lam: float = 0.9) -> float:
    """
    lam: decay factor (0 < lam < 1)
    Higher lam = slower decay
    """
    scores = np.asarray(scores)
    T = len(scores)
    weights = np.array([lam ** (T - t - 1) for t in range(T)])
    return float(np.sum(weights * scores) / np.sum(weights))


def last_score(scores):
    scores = np.asarray(scores)
    return float(scores[-1])


def trend_slope(scores: List[float]) -> float:
    scores = np.asarray(scores)
    T = len(scores)

    if T < 2:
        return 0.0

    t = np.arange(1, T + 1)
    t_mean = t.mean()
    y_mean = scores.mean()

    numerator = np.sum((t - t_mean) * (scores - y_mean))
    denominator = np.sum((t - t_mean) ** 2)

    return float(numerator / denominator)


def first_last_delta(scores: List[float]) -> float:
    scores = np.asarray(scores)
    return float(scores[-1] - scores[0])

def recent_trend_slope(scores: List[float], k: int = 5) -> float:
    if len(scores) < k:
        return trend_slope(scores)
    return trend_slope(scores[-k:])


def score_std(scores: List[float]) -> float:
    scores = np.asarray(scores)
    return float(scores.std())

def coefficient_of_variation(scores: List[float], eps: float = 1e-8) -> float:
    scores = np.asarray(scores)
    mean = scores.mean()
    std = scores.std()
    return float(std / (mean + eps))

def num_assessments(scores: List[float]) -> int:
    return len(scores)


def mastery_consistency(scores, threshold=MASTERY_THRESHOLD):
    scores = np.asarray(scores)
    return float(np.mean(scores >= threshold))

def recent_decay(scores, k=3):
    if len(scores) < k:
        return 0.0
    overall_mean = scores.mean()
    recent_mean = scores.iloc[-k:].mean()
    return recent_mean - overall_mean


def downside_risk(scores, threshold=PASSING_THRESHOLD):
    scores = np.asarray(scores)
    if len(scores) == 0:
        return 0.0
    return (scores < threshold).mean()


def make_stationary(student_data):
    student_data = student_data.sort_values("date").copy()
    student_data["score_diff"] = student_data["score"].diff()
    student_data["normalized_score_diff"] = student_data["normalized_scores"].diff()
    student_data.dropna(inplace=True)
    return student_data



def make_predictions(features_df, analysis_document):
    """
    Make predictions for all students using the features_df (aggregated) and analysis_document
    Returns features_df with predictions and status added.
    """
    # drop the non-feature columns
    X = features_df.drop(columns=["student_id", "normalized_passing_threshold", "test_number"], errors='ignore')
    x_numpy = X.to_numpy()

    # get the model from the model file
    model_path = os.path.join(os.path.dirname(__file__), "model", "esptfa_xgboost.pkl")
    if not os.path.exists(model_path):
        logger.error(f"Model not found at path: {model_path}")
        raise FileNotFoundError(f"Model not found at path: {model_path}")
    
    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise

    # make the predictions
    # predictions is a numpy array of length = number of students
    normalized_predictions = model.predict(x_numpy)
    
    # set post test max score
    post_test_max_score = analysis_document.post_test_max_score if analysis_document.post_test_max_score else DEFAULT_POST_TEST_MAX_SCORE
    
    # add the predictions to the features_df (one row per student)
    # convert to raw scores for saving to DB
    features_df["predictions"] = normalized_predictions * post_test_max_score
    # ensure that the predictions is between 0 and max score
    features_df["predictions"] = features_df["predictions"].clip(lower=0, upper=post_test_max_score)
    features_df["post_test_max_score"] = post_test_max_score

    # assign the predicted status
    features_df = assign_predicted_status(features_df)

    return features_df



def assign_predicted_status(student_data):
    """
        Assign the predicted status to the student data
    """
    # Vectorized assignment is more efficient and avoids iterrows copy issues
    mask = student_data["predictions"] >= (student_data["post_test_max_score"] * student_data["normalized_passing_threshold"])
    student_data["predicted_status"] = np.where(mask, "Pass", "Fail")
    
    return student_data 


def save_predictions(student_data, analysis_document):
    """
        Save the predictions to db with PredictedScore
    """

    # get the students by LRN (primary key)
    unique_lrns = student_data["student_id"].unique()
    students_query = Student.objects.filter(lrn__in=unique_lrns)
    student_map = {s.lrn: s for s in students_query}

    # pred scores to save arr
    pred_scores = []

    # save the predictions to db
    for _, row in student_data.iterrows():
        student = student_map.get(row["student_id"])
        if not student:
            logger.error(f"Student {row['student_id']} not found in database.")
            continue

        pred_scores.append(PredictedScore(
            student_id=student,
            score=row["predictions"],
            max_score=row["post_test_max_score"],
            passing_threshold=row["normalized_passing_threshold"],
            predicted_status=row["predicted_status"],
            analysis_document=analysis_document,
            test_number=row["test_number"],
        ))

    
    PredictedScore.objects.bulk_create(pred_scores)

    



# def grid_search_arima(train_series):
#     p_values = range(0, 2)
#     d_values = [1]  # Differencing is manually applied, so d=1
#     q_values = range(0, 2)

#     best_aic = float("inf")
#     best_order = None
#     best_model = None

#     for p, d, q in product(p_values, d_values, q_values):
#         try:
#             model = ARIMA(train_series, order=(p, d, q), freq="7D")
#             fitted_model = model.fit()
#             if fitted_model.aic < best_aic:
#                 best_aic = fitted_model.aic
#                 best_order = (p, d, q)
#                 best_model = fitted_model
#         except:
#             continue

#     return best_order, best_model




# def arima_prediction(arima_model, student_scores, last_normalized_score, last_max_score):
#     """ Generates an ARIMA prediction for a given student's time series. """

#     arima_pred = arima_model.forecast(steps=1)[0]

#     # reverse differencing
#     predicted_normalized_score = arima_pred + last_normalized_score

#     # reverse normalization
#     predicted_score = predicted_normalized_score * last_max_score

#     return predicted_score


# def train_model(processed_data, analysis_document):
#     """ Trains ARIMA for each student and applies the hybrid approach. """

#     first_fa_number = processed_data["test_number"].iloc[0]

#     for student_id, student_data in processed_data.groupby("student_id"):
#         # student_id here is the student's LRN from the DataFrame
#         student = Student.objects.filter(lrn=student_id).first()
#         if not student:
#             logger.error(f"Student with LRN {student_id} not found.")
#             continue

#         differenced_student_data = make_stationary(student_data.copy())

#         train = differenced_student_data.copy()


#         train.set_index("date", inplace=True)

#         best_order, best_model = grid_search_arima(
#             train["normalized_score_diff"])

#         if best_order:
#             last_max_score = train["max_score"].iloc[-1]
#             # Base ARIMA Prediction
#             arima_predictions = [arima_prediction(
#                 best_model, train["normalized_score_diff"], train["normalized_scores"].iloc[-1], last_max_score)]


#             # calculate the nearest prediction from the last test score
#             mae_arima = mean_absolute_error([train["score"].iloc[-1]], arima_predictions)

#             # determine whether the mae_arima is better than mae_hybrid and then use that as the predicted score
#             best_prediction = arima_predictions

#             with transaction.atomic():
#                 for i, (date, actual_score, max_score) in enumerate(zip(student_data["date"], student_data["score"], student_data["max_score"])):
#                     passing_threshold = 0.75 * max_score
#                     FormativeAssessmentScore.objects.update_or_create(
#                         analysis_document=analysis_document,
#                         student_id=student,
#                         formative_assessment_number=str(first_fa_number + i),
#                         date=date,
#                         score=actual_score,
#                         passing_threshold=passing_threshold
#                     )

#                 last_fa_number = differenced_student_data["test_number"].iloc[-1]
#                 future_dates = pd.date_range(
#                     start=train.index[-1] + pd.Timedelta(days=7), periods=len(arima_predictions), freq="7D")


#                 for i, (date, predicted_score) in enumerate(zip(future_dates, best_prediction)):
                    
#                     # calculate for the predicted score status
#                     passing_threshold = 0.75 * last_max_score
#                     if predicted_score >= passing_threshold:
#                         predicted_status = "pass"
#                     else:
#                         predicted_status = "fail"

#                     PredictedScore.objects.update_or_create(
#                         analysis_document=analysis_document,
#                         student_id=student,
#                         formative_assessment_number=str(
#                             last_fa_number + i + 1),
#                         date=date,
#                         score=predicted_score,
#                         predicted_status=predicted_status,
#                         passing_threshold=passing_threshold,
#                         max_score=last_max_score
#                     )

# function for computing necessary statistics


def arima_driver(analysis_document):
    """ Driver function for the ARIMA model prediction. Starts the process of predicting scores for students."""
    try:
        processed_data, features_df = preprocess_data(analysis_document)
        predictions_df = make_predictions(features_df, analysis_document)
        save_predictions(predictions_df, analysis_document)

        compute_document_statistics(processed_data, analysis_document)
        compute_test_statistics(processed_data, analysis_document)
        compute_student_statistics(processed_data, analysis_document)

        logger.info("Analysis document processed successfully for analysis document {}".format(analysis_document.analysis_document_id))


        # Update the status of the analysis document to True (processed)
        document_status = True
        analysis_document.status = document_status
        analysis_document.save()
        return document_status
    
    except FormativeAssessmentScore.DoesNotExist:
        logger.error(
            f"No formative assessment scores found for analysis document {analysis_document.analysis_document_id}")
        raise
    except Exception as e:
        logger.error(
            f"Error processing analysis document {analysis_document.analysis_document_id}: {str(e)}")
        logger.error(traceback.format_exc())
        raise
