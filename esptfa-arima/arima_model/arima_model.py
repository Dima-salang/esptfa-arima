from itertools import product
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA
from pmdarima import auto_arima
from sklearn.metrics import mean_absolute_error
from sklearn.ensemble import RandomForestRegressor
from statsmodels.tsa.stattools import adfuller
import os


arima_results = []

def preprocess_data(csv_file):
    test_data = pd.read_csv(csv_file)

    # Define test dates (assuming weekly tests)
    num_tests = test_data.shape[1] - 4  # Exclude student_id, name, and section
    print(test_data.shape)
    test_dates = pd.date_range(start="2024-01-01", periods=num_tests, freq="7D")

    # Reshape from wide to long format
    test_data_long = test_data.melt(id_vars=["student_id", "first_name", "last_name", "section"],
                    var_name="test",
                    value_name="score")

    # Extract test number & assign correct dates
    test_data_long["test_number"] = test_data_long["test"].str.extract("(\d+)").astype(int)
    test_data_long["date"] = test_data_long["test_number"].apply(lambda x: test_dates[x - 1])

    # Drop old test column
    test_data_long.drop(columns=["test"], inplace=True)

    # Handling missing values
    test_data_long["score"].fillna(test_data_long["score"].mean(), inplace=True)

    # Print reshaped dataset
    print(test_data_long.head())

    return test_data_long


def make_stationary(student_data):
    # Ensure data is sorted
    student_data = student_data.sort_values("date").copy()

    # Apply first-order differencing
    student_data["score_diff"] = student_data["score"].diff()

    # Drop NaN values (first row will be NaN)
    return student_data.dropna()



def grid_search_arima(train_series, p_values, d_values, q_values):
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
            continue  # Skip invalid models

    return best_order, best_model


def train_model(processed_data):
    

    p_values = range(0, 2)
    d_values = [1]  # Differencing is manually applied, so d=1
    q_values = range(0, 2)

    for student, student_data in processed_data.groupby("student_id"):
        print(f"Student: {student}")

        student_data = make_stationary(student_data)
        num_tests = student_data.shape[0]

        train = student_data.iloc[:num_tests - 2].copy()
        test = student_data.iloc[num_tests - 2:].copy()

        # Ensure index is datetime
        train.set_index("date", inplace=True)
        test.set_index("date", inplace=True)

        # Perform grid search to find the best (p, d, q)
        best_order, best_model = grid_search_arima(
            train["score_diff"], p_values, d_values, q_values)

        if best_order:
            print(f"Best ARIMA Order for {student}: {best_order}")

            # Forecast differenced values
            diff_predictions = best_model.forecast(steps=test.shape[0])

            # Convert back to original scale
            last_train_score = train["score"].iloc[-1]  # Last known value
            predictions = np.cumsum(diff_predictions) + last_train_score

            # Compute residuals
            residuals = train["score_diff"] - best_model.fittedvalues
            residuals = residuals.dropna()
                # Train Random Forest on residuals
            X_train = np.arange(len(residuals)).reshape(-1, 1)
            y_train = residuals.values
            rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
            rf_model.fit(X_train, y_train)

            # Predict residuals for future steps
            X_test = np.arange(len(residuals), len(residuals) + len(test)).reshape(-1, 1)
            predicted_residuals = rf_model.predict(X_test)
            predicted_residuals = np.cumsum(predicted_residuals) + residuals.iloc[-1]
            # Correct ARIMA predictions
            corrected_predictions = predictions + predicted_residuals

            # Evaluate accuracy
            mae_arima = mean_absolute_error(test["score"], predictions)
            mae_hybrid = mean_absolute_error(test["score"], corrected_predictions)

            print(f"ARIMA MAE: {mae_arima:.2f}, Hybrid MAE: {mae_hybrid:.2f}")

            arima_results.append({
                "student_id": student,
                "actual_scores": test["score"].tolist(),
                "arima_predictions": predictions.tolist(),
                "corrected_predictions": corrected_predictions.tolist(),
                "arima_mae": mae_arima,
                "hybrid_mae": mae_hybrid
            })
        else:
            print(f"Could not find a suitable ARIMA model for {student}.")

def driver(csv_file):
    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, csv_file)

    # Preprocess the data
    processed_data = preprocess_data(csv_path)

    # Convert to non-stationary data
    processed_data = make_stationary(processed_data)

    # Train the model
    train_model(processed_data)


    # Print results
    for r in arima_results:
        print(f"\nStudent {r['student_id']}:")
        print(f"  Actual Scores: {r['actual_scores']}")
        print(f"  ARIMA Predictions: {r['arima_predictions']}")
        print(f"  Hybrid Model Predictions: {r['corrected_predictions']}")
        print(
            f"  ARIMA MAE: {r['arima_mae']:.2f}, Hybrid MAE: {r['hybrid_mae']:.2f}")

if __name__ == "__main__":
    driver("test_scores.csv")

