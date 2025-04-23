import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pathlib import Path
import os
import json


BASE_DIR=Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Setup logger
logger = logging.getLogger("arima_model.insights")

class InsightGenerator:
    """
    Utility class to automatically generate insights and interpretations for
    data visualizations in the ESPTFA-ARIMA system.
    
    This module provides contextual interpretations of charts and statistics to help
    teachers understand student performance data without requiring statistical expertise.
    """

        


    @staticmethod
    def get_heatmap_insights(data: pd.DataFrame, value_column: str = "normalized_scores") -> Dict[str, Any]:
        """
        Generate insights from a student score heatmap.
        
        Args:
            data: DataFrame containing student data with columns 'student_id', 'test_number', and value_column
            value_column: The column containing the values to analyze (default: 'normalized_scores')
            
        Returns:
            Dictionary of insights including trends, outliers, and actionable recommendations
        """
        insights = {
            "summary": "",
            "trends": [],
            "outliers": {
                "high_performers": [],
                "low_performers": [],
                "inconsistent_performers": []
            },
            "actionable": []
        }

        # dictionary to collect the data for the gemini prompt
        gemini_insights_data = {
            "student_names": [],

        }
        
        try:
            # Prepare data
            pivot_data = data.pivot_table(
                index="student_id", 
                columns="test_number", 
                values=value_column
            )
            
            # Make sure we have first and last names
            student_names = {}
            if 'first_name' in data.columns and 'last_name' in data.columns:
                for _, row in data.drop_duplicates('student_id').iterrows():
                    student_id = row['student_id']
                    student_names[student_id] = {
                        'first_name': row['first_name'],
                        'last_name': row['last_name'],
                        'full_name': f"{row['last_name']}, {row['first_name']}"
                    }
            
            # Look for clear class trends across assessments
            test_means = pivot_data.mean()
            test_trend = test_means.pct_change().mean() * 100  # percentage change

            if abs(test_trend) < 1:
                trend_description = "maintaining consistent performance"
                trend_explanation = "scores are staying about the same across assessments"
            elif test_trend > 5:
                trend_description = "showing strong improvement"
                trend_explanation = "scores are clearly increasing from earlier to later assessments"
            elif test_trend > 0:
                trend_description = "making gradual improvement"
                trend_explanation = "scores are slightly increasing from earlier to later assessments"
            elif test_trend < -5:
                trend_description = "showing a concerning decline"
                trend_explanation = "scores are decreasing significantly from earlier to later assessments"
            else:
                trend_description = "showing slight decline"
                trend_explanation = "scores are gradually decreasing from earlier to later assessments"
                
            insights["trends"].append(f"Your class is {trend_description}: {trend_explanation}.")
            
            # Identify student groups that need attention
            student_means = pivot_data.mean(axis=1)
            student_stds = pivot_data.std(axis=1)
            
            # Top performers (top 10% with low variability)
            high_threshold = student_means.quantile(0.9)
            consistent_high = student_means[
                (student_means >= high_threshold) & 
                (student_stds <= student_stds.median())
            ]
            
            if not consistent_high.empty:
                high_performers = consistent_high.index.tolist()
                insights["outliers"]["high_performers"] = high_performers
                
                # Create string with student IDs and names
                high_performer_details = []
                for student_id in high_performers:
                    if student_id in student_names:
                        high_performer_details.append(
                            f"{student_names[student_id]['last_name']}, {student_names[student_id]['first_name']} ({student_id})"
                        )
                    else:
                        high_performer_details.append(f"{student_id}")
                
                high_performer_list = "; ".join(high_performer_details)
                insights["trends"].append(
                    f"These {len(high_performers)} students are consistently strong performers across all topics: {high_performer_list}."
                )
                    
                # Add actionable insight for high performers
                insights["actionable"].append(
                    f"✓ Provide enrichment opportunities for your top performers: {high_performer_list}"
                )
            
            # Struggling students (bottom 15%)
            low_threshold = student_means.quantile(0.15)
            consistent_low = student_means[student_means <= low_threshold]
            
            if not consistent_low.empty:
                low_performers = consistent_low.index.tolist()
                insights["outliers"]["low_performers"] = low_performers
                
                # Create string with student IDs and names
                low_performer_details = []
                for student_id in low_performers:
                    if student_id in student_names:
                        low_performer_details.append(
                            f"{student_names[student_id]['last_name']}, {student_names[student_id]['first_name']} ({student_id})"
                        )
                    else:
                        low_performer_details.append(f"{student_id}")
                
                low_performer_list = "; ".join(low_performer_details)
                insights["trends"].append(
                    f"These {len(low_performers)} students need additional support across most topics: {low_performer_list}."
                )
                
                # Add specific actionable insight for struggling students
                insights["actionable"].append(
                    f"✓ Create targeted intervention group for struggling students: {low_performer_list}"
                )
            
            # Inconsistent performers (high std)
            std_threshold = student_stds.quantile(0.85)
            inconsistent = student_stds[student_stds >= std_threshold]
            
            if not inconsistent.empty:
                inconsistent_performers = inconsistent.index.tolist()
                insights["outliers"]["inconsistent_performers"] = inconsistent_performers
                
                # Create string with student IDs and names
                inconsistent_performer_details = []
                for student_id in inconsistent_performers:
                    if student_id in student_names:
                        inconsistent_performer_details.append(
                            f"{student_names[student_id]['last_name']}, {student_names[student_id]['first_name']} ({student_id})"
                        )
                    else:
                        inconsistent_performer_details.append(f"{student_id}")
                
                inconsistent_performer_list = "; ".join(inconsistent_performer_details)
                insights["trends"].append(
                    f"These {len(inconsistent_performers)} students show inconsistent performance across topics: {inconsistent_performer_list}."
                )
                
                # Add specific actionable insight for inconsistent performers
                insights["actionable"].append(
                    f"✓ Analyze topic-specific strengths and weaknesses for inconsistent performers: {inconsistent_performer_list}"
                )
            
            # Most challenging assessment
            lowest_test = test_means.idxmin()
            lowest_test_score = test_means.min() * 100  # Percentage
            insights["trends"].append(
                f"FA {lowest_test} was the most challenging with an average score of {lowest_test_score:.1f}%."
            )
            
            # Add actionable insight for most challenging assessment
            insights["actionable"].append(
                f"✓ Review teaching approach for FA {lowest_test} content before moving to related topics"
            )
            
            # Easiest assessment
            highest_test = test_means.idxmax()
            highest_test_score = test_means.max() * 100  # Percentage
            if highest_test != lowest_test:  # Only add if different from the lowest
                insights["trends"].append(
                    f"FA {highest_test} was the strongest with an average score of {highest_test_score:.1f}%."
                )
            
            # Build a clear, actionable summary
            insights["summary"] = (
                f"Class overview: Your class is {trend_description} with {len(consistent_high)} consistently high performers "
                f"and {len(consistent_low)} students needing additional support. "
                f"FA {lowest_test} was the most challenging concept for your class."
            )
            
        except Exception as e:
            logger.error(f"Error generating heatmap insights: {str(e)}")
            insights["summary"] = "Unable to generate insights due to insufficient or invalid data."
            
        return insights
    
    @staticmethod
    def get_distribution_insights(data: pd.Series, fa_number: Optional[int] = None, topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate insights from score distribution (histogram/box plot/violin plot).
        
        Args:
            data: Series containing score data
            fa_number: Optional formative assessment number for context
            topic: Optional topic covered in the assessment
            
        Returns:
            Dictionary of insights including distribution shape, outliers, and actionable recommendations
        """
        insights = {
            "summary": "",
            "distribution": "",
            "central_tendency": "",
            "spread": "",
            "outliers": [],
            "actionable": []
        }
        
        try:
            # Basic statistics
            mean = data.mean()
            median = data.median()
            std_dev = data.std()
            min_val = data.min()
            max_val = data.max()
            q1 = data.quantile(0.25)
            q3 = data.quantile(0.75)
            iqr = q3 - q1
            
            # Calculate pass rate (scores >= 70%)
            estimated_max = max_val if max_val > 0 else 100
            passing_threshold = 0.7 * estimated_max
            pass_rate = (data >= passing_threshold).mean() * 100
            
            # Distribution shape in plain language
            skewness = ((mean - median) / std_dev) if std_dev > 0 else 0
            
            if abs(skewness) < 0.2:
                distribution_type = "even"
                distribution_explanation = "Students are scoring across a balanced range"
            elif skewness > 0.5:
                distribution_type = "bottom-heavy"
                distribution_explanation = "More students scored in the lower range with fewer high scores"
            elif skewness < -0.5:
                distribution_type = "top-heavy"
                distribution_explanation = "More students scored in the higher range with fewer low scores"
            elif skewness > 0:
                distribution_type = "slightly bottom-heavy"
                distribution_explanation = "Slightly more students scored below average than above"
            else:
                distribution_type = "slightly top-heavy"
                distribution_explanation = "Slightly more students scored above average than below"
                
            insights["distribution"] = f"Score distribution is {distribution_type}: {distribution_explanation}."
            
            # Analyze spread in simple terms
            cv = (std_dev / mean) if mean > 0 else float('inf')  # Coefficient of variation
            
            if cv < 0.1:
                spread_desc = "very similar"
                spread_explanation = "almost all students scored within a narrow range"
            elif cv < 0.2:
                spread_desc = "fairly similar"
                spread_explanation = "most students scored within a similar range"
            elif cv < 0.3:
                spread_desc = "somewhat varied"
                spread_explanation = "students showed moderate differences in scores"
            else:
                spread_desc = "widely varied"
                spread_explanation = "students showed significant differences in achievement levels"
                
            insights["spread"] = f"Scores are {spread_desc}: {spread_explanation}."
            
            # Central tendency in plain language
            diff_mean_median = abs(mean - median)
            if diff_mean_median < 0.05 * max_val:
                central_desc = f"centered around {mean:.1f}"
            else:
                if mean > median:
                    central_desc = f"average ({mean:.1f}) noticeably higher than middle score ({median:.1f})"
                else:
                    central_desc = f"middle score ({median:.1f}) noticeably higher than average ({mean:.1f})"
                    
            insights["central_tendency"] = f"Class scores are {central_desc}."
            
            # Identify outliers in simple terms
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = data[(data < lower_bound) | (data > upper_bound)]
            
            if not outliers.empty:
                insights["outliers"] = outliers.tolist()
                
                if len(outliers) == 1:
                    outlier_desc = "1 student with an unusual score"
                else:
                    outlier_desc = f"{len(outliers)} students with unusual scores"
                    
                insights["distribution"] += f" There {outlier_desc} that may need individual attention."
            
            # Actionable recommendations
            if skewness > 0.5:
                insights["actionable"].append(
                    "✓ Focus on core concepts as many students scored on the lower end"
                )
                insights["actionable"].append(
                    "✓ Consider providing additional review sessions focusing on fundamentals"
                )
            elif skewness < -0.5:
                insights["actionable"].append(
                    "✓ Consider increasing difficulty or depth for future assessments"
                )
                insights["actionable"].append(
                    "✓ Provide enrichment activities for students who mastered the content"
                )
                
            if cv > 0.3:
                insights["actionable"].append(
                    "✓ Use differentiated instruction to address wide performance gaps"
                )
                insights["actionable"].append(
                    "✓ Consider flexible grouping strategies to support varied achievement levels"
                )
                
            if pass_rate < 70:
                insights["actionable"].append(
                    "✓ Reteach key concepts before moving forward to new material"
                )
                
            # Context-specific summary
            context = ""
            if fa_number is not None:
                context += f"FA #{fa_number} "
            if topic is not None:
                context += f"on {topic} "
                
            insights["summary"] = (
                f"{context}shows {pass_rate:.1f}% of students passed. {distribution_explanation}. "
                f"Scores averaged {mean:.1f} points with {spread_explanation}."
            )
                
        except Exception as e:
            logger.error(f"Error generating distribution insights: {str(e)}")
            insights["summary"] = "Unable to generate insights due to insufficient or invalid data."
            
        return insights
    
    @staticmethod
    def get_student_line_chart_insights(scores: pd.Series, fa_numbers: List, predicted_score: Optional[float] = None) -> Dict[str, Any]:
        """
        Generate insights from a student's score trend line chart.
        
        Args:
            scores: Series containing historical scores
            fa_numbers: List of formative assessment numbers corresponding to scores
            predicted_score: Optional predicted next score
            
        Returns:
            Dictionary of insights including trend analysis and recommendations
        """
        insights = {
            "summary": "",
            "trend": "",
            "progress": "",
            "prediction_context": "",
            "actionable": []
        }
        
        try:
            # Need at least 2 points for trend analysis
            if len(scores) < 2:
                insights["summary"] = "Not enough assessments to identify a clear trend yet."
                return insights
                
            # Convert to numpy arrays for calculations
            y = scores.values
            x = np.array(range(len(y)))
            
            # Simple linear regression for trend line
            slope, intercept = np.polyfit(x, y, 1)
            
            # Calculate R^2 to determine trend strength
            y_pred = slope * x + intercept
            ss_total = np.sum((y - np.mean(y))**2)
            ss_residual = np.sum((y - y_pred)**2)
            r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
            
            # Start with an easy-to-understand summary of what's happening
            first_score = y[0]
            last_score = y[-1]
            overall_change = last_score - first_score
            
            # Create simpler language for trend direction
            if abs(slope) < 0.01 * np.mean(y):
                trend_direction = "steady"
                direction_explanation = "maintaining the same level"
            elif slope > 0:
                if slope > 0.05 * np.mean(y):
                    trend_direction = "improving"
                    direction_explanation = "showing clear improvement"
                else:
                    trend_direction = "slightly improving"
                    direction_explanation = "showing gradual improvement"
            else:
                if slope < -0.05 * np.mean(y):
                    trend_direction = "declining"
                    direction_explanation = "showing a noticeable decline"
                else:
                    trend_direction = "slightly declining"
                    direction_explanation = "showing a slight decline"
            
            # Create simpler language for consistency
            if r_squared < 0.3:
                consistency = "inconsistent"
                consistency_explanation = "scores vary significantly between assessments"
            elif r_squared < 0.6:
                consistency = "somewhat consistent"
                consistency_explanation = "scores follow a general pattern with some variation"
            else:
                consistency = "consistent"
                consistency_explanation = "scores follow a clear pattern"
            
            # Clear trend description
            insights["trend"] = f"Student's scores are {trend_direction} and {consistency}."
            
            # Recent progress (focus on last 3 assessments)
            recent_count = min(3, len(scores))
            if recent_count > 1:
                recent_scores = scores.iloc[-recent_count:]
                recent_change = recent_scores.iloc[-1] - recent_scores.iloc[0]
                
                if abs(recent_change) < 0.05 * recent_scores.iloc[0]:
                    recent_trend = "stable recently"
                elif recent_change > 0:
                    if recent_change > 0.1 * recent_scores.iloc[0]:
                        recent_trend = "improving significantly in recent assessments"
                    else:
                        recent_trend = "showing slight improvement in recent assessments"
                else:
                    if abs(recent_change) > 0.1 * recent_scores.iloc[0]:
                        recent_trend = "dropping significantly in recent assessments"
                    else:
                        recent_trend = "slightly declining in recent assessments"
                
                insights["progress"] = f"The student is {recent_trend}."
            
            # Make prediction language clearer
            if predicted_score is not None:
                last_score = scores.iloc[-1]
                predicted_change = predicted_score - last_score
                
                if abs(predicted_change) < 0.05 * last_score:
                    prediction_desc = "maintain about the same score"
                elif predicted_change > 0:
                    if predicted_change > 0.1 * last_score:
                        prediction_desc = "improve significantly"
                    else:
                        prediction_desc = "improve slightly"
                else:
                    if abs(predicted_change) > 0.1 * last_score:
                        prediction_desc = "decline significantly"
                    else:
                        prediction_desc = "decline slightly"
                
                insights["prediction_context"] = f"Based on past performance, the student is predicted to {prediction_desc} in the next assessment (predicted score: {predicted_score:.1f})."
                
                # Give specific advice based on prediction
                if predicted_change < -0.05 * last_score:
                    insights["actionable"].append(
                        "✓ Provide additional support before the next assessment to prevent the predicted decline"
                    )
                elif predicted_change > 0.1 * last_score:
                    insights["actionable"].append(
                        "✓ Continue current approach as the student is projected to improve significantly"
                    )
            
            # Add actionable insights based on overall pattern
            if trend_direction == "declining":
                insights["actionable"].append(
                    "✓ Schedule a check-in meeting to identify any learning obstacles"
                )
                insights["actionable"].append(
                    "✓ Review teaching strategies for topics covered in recent assessments"
                )
            
            if trend_direction == "improving":
                insights["actionable"].append(
                    "✓ Acknowledge the student's progress to reinforce positive momentum"
                )
                insights["actionable"].append(
                    "✓ Consider more challenging material to maintain engagement"
                )
            
            if consistency == "inconsistent":
                insights["actionable"].append(
                    "✓ Identify specific topics where performance fluctuates most"
                )
                insights["actionable"].append(
                    "✓ Check for patterns in assessment types or content that may explain the inconsistency"
                )
            
            # Build a clear, concise summary
            insights["summary"] = (
                f"This student is {direction_explanation} with {consistency_explanation}. "
            )
            
            if insights["progress"]:
                insights["summary"] += insights["progress"] + " "
                
            if insights["prediction_context"]:
                insights["summary"] += insights["prediction_context"]
                
        except Exception as e:
            logger.error(f"Error generating line chart insights: {str(e)}")
            insights["summary"] = "Unable to generate insights due to insufficient or invalid data."
            
        return insights
    
    @staticmethod
    def get_bar_chart_insights(student_ids: List[str], scores: List[float], fa_number: Optional[int] = None, topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate insights from a bar chart showing student scores for a specific assessment.
        
        Args:
            student_ids: List of student IDs
            scores: List of corresponding scores
            fa_number: Optional formative assessment number
            topic: Optional topic of the assessment
            
        Returns:
            Dictionary of insights including performance distribution and notable students
        """
        insights = {
            "summary": "",
            "distribution": "",
            "top_performers": [],
            "struggling_students": [],
            "actionable": []
        }
        
        try:
            # Basic statistics
            mean = np.mean(scores)
            median = np.median(scores)
            std_dev = np.std(scores)
            max_score = max(scores)
            
            # Estimate passing threshold (75% of max score)
            passing_threshold = 0.75 * max_score
            pass_count = sum(1 for score in scores if score >= passing_threshold)
            pass_rate = pass_count / len(scores) if len(scores) > 0 else 0
            
            # Identify distribution characteristics
            if pass_rate >= 0.9:
                distribution_desc = "excellent overall performance"
                insights["actionable"].append(
                    "Consider increasing difficulty for better differentiation of student abilities."
                )
            elif pass_rate >= 0.75:
                distribution_desc = "good overall performance"
            elif pass_rate >= 0.6:
                distribution_desc = "moderate overall performance"
                insights["actionable"].append(
                    "Review topics where most students scored in the lower range."
                )
            else:
                distribution_desc = "concerning overall performance"
                insights["actionable"].append(
                    "This assessment requires reteaching of key concepts."
                )
                
            insights["distribution"] = f"The assessment shows {distribution_desc} with a {pass_rate*100:.1f}% passing rate."
            
            # Identify top performers (top 10%)
            if len(scores) >= 5:  # Enough data for meaningful analysis
                threshold = np.percentile(scores, 90)
                top_indices = [i for i, score in enumerate(scores) if score >= threshold]
                insights["top_performers"] = [student_ids[i] for i in top_indices]
                
                # Identify struggling students (bottom 15%)
                threshold = np.percentile(scores, 15)
                struggling_indices = [i for i, score in enumerate(scores) if score <= threshold]
                insights["struggling_students"] = [student_ids[i] for i in struggling_indices]
            
            # Context for summary
            context = ""
            if fa_number is not None:
                context += f"FA #{fa_number} "
            if topic is not None:
                context += f"on {topic} "
                
            # Build summary
            insights["summary"] = (
                f"{context}shows {distribution_desc}. The average score is {mean:.1f} "
                f"with {pass_rate*100:.1f}% of students passing."
            )
            
            if insights["top_performers"] and len(insights["top_performers"]) <= 3:
                top_performers_str = ", ".join(insights["top_performers"])
                insights["summary"] += f" Top performers: {top_performers_str}."
                
            if insights["struggling_students"] and pass_rate < 0.7:
                insights["actionable"].append(
                    f"Consider targeted intervention for {len(insights['struggling_students'])} struggling students."
                )
                
        except Exception as e:
            logger.error(f"Error generating bar chart insights: {str(e)}")
            insights["summary"] = "Unable to generate insights due to insufficient or invalid data."
            
        return insights
    
    @staticmethod
    def get_student_comparison_insights(student_ids: List[str], scores: List[float], class_average: float, 
                                        passing_threshold: Optional[float] = None, fa_number: Optional[int] = None, 
                                        topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate insights for the student comparison chart (student scores vs class average).
        
        Args:
            student_ids: List of student IDs
            scores: List of student scores
            class_average: Average score for the class
            passing_threshold: Threshold for passing the assessment (optional)
            fa_number: Formative assessment number (optional)
            topic: Assessment topic (optional)
            
        Returns:
            Dictionary with insights about student performance compared to class average
        """
        insights = {}
        
        # Convert data to numpy arrays for analysis
        scores_array = np.array(scores)
        
        # Basic validation
        if len(student_ids) == 0 or len(scores) == 0:
            return {"summary": "No data available for analysis."}
        
        # Identify students above and below average
        above_avg_count = np.sum(scores_array > class_average)
        below_avg_count = np.sum(scores_array < class_average)
        equal_avg_count = np.sum(scores_array == class_average)
        
        total_students = len(scores)
        above_avg_pct = (above_avg_count / total_students) * 100
        below_avg_pct = (below_avg_count / total_students) * 100
        
        # Calculate score differences from average
        differences = scores_array - class_average
        max_above = np.max(differences) if above_avg_count > 0 else 0
        max_below = abs(np.min(differences)) if below_avg_count > 0 else 0
        
        # Identify top performers and struggling students
        sorted_indices = np.argsort(scores_array)[::-1]  # Sort in descending order
        top_indices = sorted_indices[:3]  # Top 3 performers
        bottom_indices = sorted_indices[-3:]  # Bottom 3 performers
        
        top_performers = [student_ids[i] for i in top_indices]
        struggling_students = [student_ids[i] for i in bottom_indices]
        
        # Generate summary
        assessment_context = f"for Formative Assessment {fa_number}" if fa_number else ""
        topic_context = f"on the topic of {topic}" if topic else ""
        
        summary = (
            f"Class performance analysis {assessment_context} {topic_context} shows "
            f"{above_avg_count} students ({above_avg_pct:.1f}%) performing above the class average of {class_average:.1f}, "
            f"while {below_avg_count} students ({below_avg_pct:.1f}%) are below average."
        )
        
        # Add passing threshold context if available
        if passing_threshold is not None:
            pass_count = np.sum(scores_array >= passing_threshold)
            pass_pct = (pass_count / total_students) * 100
            summary += f" Overall, {pass_count} students ({pass_pct:.1f}%) met or exceeded the passing threshold of {passing_threshold:.1f}."
        
        insights["summary"] = summary.strip()
        
        # Add top performers insight
        if top_performers:
            insights["top_performers"] = (
                f"The top performing students are {', '.join(top_performers)} with scores "
                f"ranging from {scores_array[top_indices[-1]]:.1f} to {scores_array[top_indices[0]]:.1f}."
            )
        
        # Add struggling students insight
        if struggling_students:
            insights["struggling_students"] = (
                f"Students needing additional support include {', '.join(struggling_students)} with scores "
                f"ranging from {scores_array[bottom_indices[0]]:.1f} to {scores_array[bottom_indices[-1]]:.1f}."
            )
        
        # Add trends insight
        if max_above > 0 or max_below > 0:
            insights["trends"] = (
                f"The greatest deviation from the class average is "
                f"{max_above:.1f} points above average and {max_below:.1f} points below average, "
                f"indicating a performance gap of {max_above + max_below:.1f} points between the highest and lowest performers."
            )
        
        # Add actionable insights
        actionable = []
        
        if below_avg_count > total_students * 0.3:  # More than 30% below average
            actionable.append(
                f"Consider group interventions for the {below_avg_count} students performing below the class average."
            )
            
        if passing_threshold is not None and np.sum(scores_array < passing_threshold) > 0:
            actionable.append(
                f"Provide targeted support for students below the passing threshold with focused review on this topic."
            )
            
        if above_avg_count < total_students * 0.4:  # Less than 40% above average
            actionable.append(
                f"Review teaching strategies for this topic as a significant portion of the class is clustering below average."
            )
            
        if max_above > class_average * 0.2:  # Top performers exceeding average by 20%+
            actionable.append(
                f"Consider enrichment activities for top performers who are significantly above the class average."
            )
        
        if actionable:
            insights["actionable"] = actionable
        
        return insights
    
    @staticmethod
    def get_student_vs_class_comparison_insights(test_numbers: List[str], student_scores: List[float], 
                                               class_averages: List[float], student_id: Optional[str] = None,
                                               student_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate insights for the comparison between a single student's performance and class averages across multiple assessments.
        
        Args:
            test_numbers: List of formative assessment numbers
            student_scores: List of the student's scores
            class_averages: List of class average scores for each assessment
            student_id: Optional student ID for personalized insights
            student_name: Optional student name for more personalized insights
            
        Returns:
            Dictionary with insights about the student's performance compared to class averages
        """
        insights = {}
        
        # Convert data to numpy arrays for analysis
        student_scores_array = np.array(student_scores)
        class_averages_array = np.array(class_averages)
        
        # Basic validation
        if len(test_numbers) == 0 or len(student_scores) == 0 or len(class_averages) == 0:
            return {"summary": "No data available for analysis."}
        
        # Calculate differences between student scores and class averages
        differences = student_scores_array - class_averages_array
        
        # Count assessments where student performed above/below average
        above_avg_count = np.sum(differences > 0)
        below_avg_count = np.sum(differences < 0)
        at_avg_count = np.sum(differences == 0)
        
        total_assessments = len(test_numbers)
        above_avg_pct = (above_avg_count / total_assessments) * 100
        
        # Calculate average difference
        avg_difference = np.mean(differences)
        
        # Identify trends
        consistent_performer = (above_avg_count == total_assessments) or (below_avg_count == total_assessments)
        improving_trend = False
        declining_trend = False
        
        if len(differences) >= 3:
            # Check if the last 3 differences show improvement
            last_three = differences[-3:]
            improving_trend = all(last_three[i] < last_three[i+1] for i in range(len(last_three)-1))
            declining_trend = all(last_three[i] > last_three[i+1] for i in range(len(last_three)-1))
        
        # Generate clear, concise summary
        student_context = f"{student_name}" if student_name else (f"Student {student_id}" if student_id else "This student")
        
        # Create a more readable and impactful summary
        if above_avg_count > below_avg_count:
            if above_avg_pct >= 90:
                performance_level = "consistently exceeds"
            elif above_avg_pct >= 75:
                performance_level = "regularly exceeds"
            else:
                performance_level = "tends to exceed"
            
            summary = f"{student_context} {performance_level} class average in {above_avg_count} of {total_assessments} assessments."
        elif below_avg_count > above_avg_count:
            below_avg_pct = (below_avg_count / total_assessments) * 100
            if below_avg_pct >= 90:
                performance_level = "consistently performs below"
            elif below_avg_pct >= 75:
                performance_level = "regularly performs below"
            else:
                performance_level = "tends to perform below"
                
            summary = f"{student_context} {performance_level} class average in {below_avg_count} of {total_assessments} assessments."
        else:
            summary = f"{student_context} performs at the class average level in most assessments."
        
        # Add score difference information in an intuitive way
        if abs(avg_difference) > 0.5:
            if avg_difference > 0:
                summary += f" On average, scores are {abs(avg_difference):.1f} points higher than class average."
            else:
                summary += f" On average, scores are {abs(avg_difference):.1f} points lower than class average."
        
        insights["summary"] = summary
        
        # Add clear performance pattern insight
        if consistent_performer and above_avg_count == total_assessments:
            insights["performance_pattern"] = f"Strong performer: Consistently scores above class average in all assessments."
        elif consistent_performer and below_avg_count == total_assessments:
            insights["performance_pattern"] = f"Needs support: Consistently scores below class average in all assessments."
        elif improving_trend:
            insights["performance_pattern"] = f"Improving performance: Showing positive progress relative to class average in recent assessments."
        elif declining_trend:
            insights["performance_pattern"] = f"Declining performance: Recent assessments show a downward trend compared to class average."
        elif np.std(differences) > np.mean(np.abs(differences)):
            insights["performance_pattern"] = f"Inconsistent performance: Shows significant variation across different assessments/topics."
        
        # Identify strongest and weakest areas more clearly
        if total_assessments >= 2:
            best_idx = np.argmax(differences)
            worst_idx = np.argmin(differences)
            
            if differences[best_idx] > 0:
                insights["strongest_performance"] = f"Strongest in FA {test_numbers[best_idx]}: {differences[best_idx]:.1f} points above class average."
            
            if differences[worst_idx] < 0:
                insights["weakest_performance"] = f"Needs improvement in FA {test_numbers[worst_idx]}: {abs(differences[worst_idx]):.1f} points below class average."
        
        # Provide practical, actionable recommendations for teachers
        actionable = []
        
        if below_avg_count > total_assessments * 0.7:  # More than 70% below average
            actionable.append(
                "✓ Create an intervention plan with targeted support materials"
            )
            actionable.append(
                "✓ Schedule a one-on-one meeting to identify specific learning barriers"
            )
        
        if np.std(differences) > np.mean(np.abs(differences)):
            actionable.append(
                "✓ Analyze topic-specific performance to identify areas of inconsistency"
            )
            actionable.append(
                "✓ Provide focused resources for topics where the student struggles most"
            )
        
        if worst_idx is not None and differences[worst_idx] < -5:  # Significant underperformance
            actionable.append(
                f"✓ Provide additional materials for FA {test_numbers[worst_idx]} concepts"
            )
            actionable.append(
                f"✓ Consider pairing with a peer mentor who performed well on this topic"
            )
        
        if improving_trend:
            actionable.append(
                "✓ Continue current support strategy as it appears to be effective"
            )
            actionable.append(
                "✓ Acknowledge and reinforce the student's progress to maintain motivation"
            )
            
        if above_avg_count > total_assessments * 0.7:  # More than 70% above average
            actionable.append(
                "✓ Provide enrichment activities to further develop student's strengths"
            )
            actionable.append(
                "✓ Consider opportunities for this student to help peers as a peer mentor"
            )
        
        if actionable:
            insights["actionable"] = actionable
        
        return insights
    
    @staticmethod
    def get_overall_insights(document_stats: Dict[str, Any], assessment_count: int, student_count: int) -> Dict[str, Any]:
        """
        Generate overall insights about an entire analysis document.
        
        Args:
            document_stats: Dictionary containing document-level statistics
            assessment_count: Number of assessments in the document
            student_count: Number of students in the document
            
        Returns:
            Dictionary of insights about the entire class across all assessments
        """
        insights = {
            "summary": "",
            "performance": "",
            "consistency": "",
            "trends": [],
            "actionable": []
        }
        
        try:
            # Extract basic statistics
            mean = document_stats.get("mean", 0)
            median = document_stats.get("median", 0)
            std_dev = document_stats.get("standard_deviation", 0)
            min_val = document_stats.get("minimum", 0)
            max_val = document_stats.get("maximum", 0)
            passing_threshold = document_stats.get("mean_passing_threshold", 0)
            
            # Estimate overall passing rate (if not directly available)
            # This is a rough approximation; actual implementation might use more precise calculation
            pass_rate_estimate = 0.5 + 0.5 * ((mean - passing_threshold) / passing_threshold) if passing_threshold > 0 else 0.5
            pass_rate_estimate = max(0, min(1, pass_rate_estimate))
            pass_rate_pct = pass_rate_estimate * 100
            
            # Interpret overall performance in clear terms
            if pass_rate_pct >= 85:
                performance_desc = "excellent class performance"
                performance_explanation = f"{pass_rate_pct:.0f}% of students are passing, showing strong mastery of content"
            elif pass_rate_pct >= 75:
                performance_desc = "good class performance"
                performance_explanation = f"{pass_rate_pct:.0f}% of students are passing, showing solid understanding"
            elif pass_rate_pct >= 60:
                performance_desc = "satisfactory class performance"
                performance_explanation = f"{pass_rate_pct:.0f}% of students are passing, but some may need additional support"
            else:
                performance_desc = "concerning class performance"
                performance_explanation = f"Only {pass_rate_pct:.0f}% of students are passing, indicating significant learning gaps"
                insights["actionable"].append(
                    "✓ Review teaching approaches and provide comprehensive review materials"
                )
                insights["actionable"].append(
                    "✓ Consider adjusting the pace of instruction to ensure concept mastery"
                )
                
            insights["performance"] = f"The class shows {performance_desc} across {assessment_count} assessments: {performance_explanation}."
            
            # Interpret consistency in simple language
            cv = std_dev / mean if mean > 0 else float('inf')
            
            if cv < 0.15:
                consistency_desc = "very similar"
                consistency_explanation = "almost all students are scoring at similar levels"
                consistency_action = "consider offering enrichment for high achievers and targeted support for others"
            elif cv < 0.25:
                consistency_desc = "fairly similar"
                consistency_explanation = "most students are scoring within a similar range"
                consistency_action = "use small group instruction to address specific needs"
            elif cv < 0.35:
                consistency_desc = "somewhat varied"
                consistency_explanation = "there are notable differences in student achievement levels"
                consistency_action = "use differentiated instruction to address varied needs"
            else:
                consistency_desc = "widely varied"
                consistency_explanation = "there are substantial differences in student achievement levels"
                consistency_action = "implement targeted interventions based on achievement levels"
                insights["actionable"].append(
                    f"✓ {consistency_action}"
                )
                
            insights["consistency"] = f"Student scores are {consistency_desc}: {consistency_explanation}."
            
            # Add trend insights in plain language
            skewness = ((mean - median) / std_dev) if std_dev > 0 else 0
            
            if abs(skewness) > 0.5:
                if skewness > 0:
                    insights["trends"].append(
                        "Most students are scoring in the lower range with a few high performers."
                    )
                    insights["actionable"].append(
                        "✓ Focus on core concepts to help the majority of students improve"
                    )
                else:
                    insights["trends"].append(
                        "Most students are scoring in the higher range with a few struggling students."
                    )
                    insights["actionable"].append(
                        "✓ Provide individual support for the few struggling students while challenging the high performers"
                    )
            
            # Build an easy-to-understand summary
            insights["summary"] = (
                f"Class overview: {student_count} students across {assessment_count} assessments show "
                f"{performance_desc} with {consistency_desc} achievement levels. "
                f"The class average is {mean:.1f} out of {max_val:.1f} points."
            )
            
        except Exception as e:
            logger.error(f"Error generating overall insights: {str(e)}")
            insights["summary"] = "Unable to generate class-level insights due to insufficient or invalid data."
            
        return insights


# Helper functions for external use

def get_visualization_insights(viz_type: str, *args, **kwargs) -> Dict[str, Any]:
    """
    Public function to get insights for a specific visualization type.
    
    Args:
        viz_type: Type of visualization ('heatmap', 'distribution', 'line_chart', 'bar_chart', 'overall', 'student_comparison', 'student_vs_class_comparison')
        *args, **kwargs: Arguments specific to the visualization type
        
    Returns:
        Dictionary containing insights for the specified visualization type
    """
    try:
        if viz_type == 'heatmap':
            return InsightGenerator.get_heatmap_insights(*args, **kwargs)
        elif viz_type == 'distribution':
            return InsightGenerator.get_distribution_insights(*args, **kwargs)
        elif viz_type == 'line_chart':
            return InsightGenerator.get_student_line_chart_insights(*args, **kwargs)
        elif viz_type == 'bar_chart':
            return InsightGenerator.get_bar_chart_insights(*args, **kwargs)
        elif viz_type == 'overall':
            return InsightGenerator.get_overall_insights(*args, **kwargs)
        elif viz_type == 'student_comparison':
            return InsightGenerator.get_student_comparison_insights(*args, **kwargs)
        elif viz_type == 'student_vs_class_comparison':
            return InsightGenerator.get_student_vs_class_comparison_insights(*args, **kwargs)
        else:
            logger.error(f"Unsupported visualization type: {viz_type}")
            return {"summary": f"Insights not available for {viz_type} visualization type."}
    except Exception as e:
        logger.error(f"Error getting insights for {viz_type}: {str(e)}")
        return {"summary": "Unable to generate insights due to an unexpected error."}



def get_gemini_insights(insights: Dict[str, Any]):
    """
    Generate insights using Gemini.

    Args:
        data: The data to generate insights from.

    Returns:
        text insight generated by Gemini
    """
    system_instruction = """
    You are an expert education analyst and assistant built for teachers. You analyze student performance data to generate meaningful, concise insights that help teachers make better decisions.

    You will be given a JSON structure containing statistics and student scores from formative assessments. Based on that data, generate helpful insights that are easy to understand and actionable.

    Be specific, avoid generic observations. Highlight important trends, anomalies, and opportunities to improve teaching outcomes. Write in plain, teacher-friendly language using short, clear sentences.

    ### Your output must strictly follow this JSON format:
    {
    "summary": "A concise but detailed summary of the most important takeaway.",
    "trends": ["One-line trends in the data (e.g., 'Average scores are declining across assessments.')"],
    "insights": ["Concise observations from the data (e.g., 'Most students performed better in Geometry than in Algebra.')"],
    "outliers": ["Unusual scores or patterns (e.g., 'Student 104 scored 95 in FA3 but 30 in FA4.')"],
    "actionable": ["Immediate actions the teacher can take (e.g., 'Re-teach Algebra before the next assessment.')"],
    "recommendations": ["Longer-term advice (e.g., 'Monitor students with scores below 60 across 3 or more tests.')"]
    }

    Use bullet points only inside lists. Limit each list to a maximum of 5 items. Be precise and helpful. Do not include explanations outside of the JSON.
    """


    # turn insights into a json string
    insights_json = json.dumps(insights)

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=insights_json,
        config=types.GenerateContentConfig(
            temperature=0.1,
            system_instruction=system_instruction
        ),
    )

    print(response.text)
    response_text = response.text

    # Try to parse the response as JSON
    try:
        # Clean the response in case it has Markdown code block formatting
        if "```json" in response_text:
            # Extract content between ```json and ```
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            # Extract content from generic code block
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        # Parse the cleaned JSON
        parsed_insights = json.loads(response_text)
        return parsed_insights
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        logger.error(f"Raw response: {response_text}")
        
        # Return a fallback dictionary with the raw text
        return {
            "summary": "Error parsing structured insights",
            "raw_text": response_text
        }