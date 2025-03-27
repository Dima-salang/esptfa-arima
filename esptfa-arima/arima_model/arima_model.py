import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA
from pmdarima import auto_arima
from sklearn.metrics import mean_absolute_error


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


processed_data = preprocess_data("esptfa-arima/arima_model/test_scores.csv")


def train_model(processed_data):
    
    # train the model on each student individually
    for student, student_data in processed_data.groupby("student_id"):
        print(f"Student: {student}")
        num_tests = student_data.shape[0]
        print("Number of Tests:", num_tests)
        
        student_data = student_data.sort_values("date")
        train = student_data.iloc[:num_tests-2]
        test = student_data.iloc[num_tests-2:]

        model = auto_arima(train["score"], order=(1,1,1), dates=train["date"], freq="7D")
        model = model.fit()
        predictions = model.forecast(steps=test.shape[0])
        mae = mean_absolute_error(test["score"], predictions)
        print("Actual Test Scores:", test["score"].to_list())
        print(f"Predicted Next Score for {student}: {predictions.to_list()}")
        
train_model(processed_data)
# Sample test score data
data = {
    "date": pd.date_range(start="2024-01-01", periods=7, freq="7D"),
    "score": [75, 78, 80, 82, 84, 87, 90]
}

# Convert to DataFrame
df = pd.DataFrame(data)
df.set_index("date", inplace=True)

# Split into training (first 15 weeks) and test set (last 5 weeks)
train = df.iloc[:5]  # Training data (first 15 rows)
test = df.iloc[5:]   # Testing data (last 5 rows)

# Train ARIMA model (using (p=1, d=1, q=1) for simplicity)
model = ARIMA(train["score"], order=(1, 1, 1))
fitted_model = model.fit()

# Forecast next 5 test scores
predictions = fitted_model.forecast(steps=2)

# Evaluate performance
mae = mean_absolute_error(test["score"], predictions)

# Print results
print("Actual Test Scores:", test["score"].tolist())
print("Predicted Scores:  ", predictions.tolist())
print("Mean Absolute Error:", round(mae, 2))

# Plot results
plt.figure(figsize=(10, 5))
plt.plot(train.index, train["score"], label="Training Data", color="blue")
plt.plot(test.index, test["score"], label="Actual Test Data", color="green")
plt.plot(test.index, predictions, label="Predictions",
         color="red", linestyle="dashed")
plt.xlabel("Date")
plt.ylabel("Test Score")
plt.legend()
plt.title("ARIMA Model - Test Score Prediction")
plt.show()
