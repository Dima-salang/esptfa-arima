import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error

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
