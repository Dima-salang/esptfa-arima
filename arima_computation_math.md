# ESPTFA-ARIMA Backend Computations and Mathematical Formulation

This document outlines the detailed calculations, statistical aggregations, and feature engineering rules implemented in the Python backend (`arima_model.py` and `arima_statistics.py`).

---

## 1. Feature Engineering and Preprocessing (`arima_model.py`)

Raw formative assessment scores are normalized against the max possible score for each assessment ($NormalizedScore = \frac{Score}{MaxScore}$). 

For each learner, the historical series of normalized scores $S = [s_1, s_2, \dots, s_T]$ (where $t$ represents the assessment index and $T$ is the total number of assessments) is used to compute the following predictive features:

### A. Weighted Mean Score
Applies exponential decay weights so that recent assessments contribute more heavily.
$$\text{Weighted Mean} = \frac{\sum_{t=0}^{T-1} \lambda^{T - t - 1} \cdot s_t}{\sum_{t=0}^{T-1} \lambda^{T - t - 1}}$$
* **Default Decay Factor ($\lambda$):** `0.9`

### B. Standard Deviation of Scores
Measures overall performance volatility.
$$\text{Std Dev} = \sqrt{\frac{1}{T}\sum_{t=1}^T (s_t - \bar{s})^2}$$

### C. Last Score
The normalized score on the most recent assessment.
$$\text{Last Score} = s_T$$

### D. Trend Slope
Computes the slope of the simple linear regression line fitted to the student's normalized scores over time $t = [1, 2, \dots, T]$.
$$\text{Trend Slope} = \frac{\sum_{t=1}^T (t - \bar{t})(s_t - \bar{s})}{\sum_{t=1}^T (t - \bar{t})^2}$$

### E. First-Last Delta
The absolute delta difference between the final and initial formative assessment.
$$\Delta_{FirstLast} = s_T - s_1$$

### F. Recent Trend Slope
Calculates the trend slope using only the last $k$ assessments.
$$\text{Recent Slope} = \text{TrendSlope}(S_{recent}) \quad \text{where} \quad S_{recent} = [s_{T-k+1}, \dots, s_T]$$
* **Default window size ($k$):** `5`

### G. Coefficient of Variation
Measures relative variability, adjusting standard deviation by the mean.
$$CV = \frac{\text{Std Dev}}{\text{Mean} + \epsilon}$$
* **Default epsilon ($\epsilon$):** `1e-8` (to prevent division by zero).

### H. Mastery Consistency
Computes the proportion of formative assessments where the learner achieved or exceeded the mastery threshold.
$$\text{Mastery Consistency} = \frac{1}{T} \sum_{t=1}^T \mathbb{I}(s_t \ge \theta_{mastery})$$
* **Mastery Threshold ($\theta_{mastery}$):** `0.90` ($90\%$)

### I. Recent Decay
Compares the average of the last $k$ assessments against the overall historical average to detect recent drops in performance.
$$\text{Recent Decay} = \text{Mean}(s_{T-k+1}, \dots, s_T) - \text{Mean}(s_1, \dots, s_T)$$
* **Default decay window ($k$):** `3`

### J. Downside Risk
Measures the proportion of assessments where the learner fell below the passing threshold.
$$\text{Downside Risk} = \frac{1}{T} \sum_{t=1}^T \mathbb{I}(s_t < \theta_{passing})$$
* **Passing Threshold ($\theta_{passing}$):** `0.75` ($75\%$)

---

## 2. Machine Learning Predictions (`arima_model.py`)

1. **Model Loader**: Load the pre-trained XGBoost model from the pickle binary `esptfa_xgboost.pkl`.
2. **Features Input**: Feeds the vector of $10$ engineered features per student into the XGBoost model.
3. **Raw Scaling**: The model outputs a normalized prediction $\hat{y}_{norm} \in [0, 1]$. This is scaled up to the raw post-test max score:
$$\hat{y}_{raw} = \text{clip}(\hat{y}_{norm} \times \text{PostTestMaxScore}, \, 0, \, \text{PostTestMaxScore})$$
* **Default Post-Test Max Score:** `60.0`
4. **Predicted Status Classification**:
$$\text{Status} = \begin{cases} \text{Pass} & \text{if } \hat{y}_{raw} \ge (\text{PostTestMaxScore} \times 0.75) \\ \text{Fail} & \text{otherwise} \end{cases}$$

---

## 3. Statistical Calculations (`arima_statistics.py`)

### A. Document Statistics
Aggregates across all student scores in an analysis document:
* **Mean:** Average of all raw formative scores.
* **Median:** Median score of all raw formative scores.
* **Standard Deviation:** Standard deviation of all raw formative scores.
* **Minimum / Maximum:** Range of raw scores.
* **Mode:** Most frequent raw score.
* **Total Learners:** Unique count of student IDs.
* **Mean Passing Threshold:** $75\%$ of the average maximum score across all assessments.

### B. Test (Formative Assessment) Statistics
Aggregates per assessment number:
* **Total Scores:** Count of records.
* **Passing Threshold:** $75\%$ of the maximum score for that test.
* **Passing Scores:** Count of students scoring $\ge$ passing threshold.
* **Passing Rate:** $\frac{\text{Passing Scores}}{\text{Total Scores}} \times 100$
* **Failing Rate:** $\frac{\text{Total Scores} - \text{Passing Scores}}{\text{Total Scores}} \times 100$

### C. Student Overall Statistics
Aggregates per student LRN:
* **Mean, Median, Standard Deviation, Mode, Min, Max** based on the student's raw formative scores.
* **Passing Rate:** Percentage of assessments where $NormalizedScore \ge 0.75$.
* **Failing Rate:** Percentage of assessments where $NormalizedScore < 0.75$.
* **Sum Scores:** Sum of all scores earned by the student.
* **Max Possible Score:** Total maximum points available across all completed assessments.
