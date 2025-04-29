import pandas as pd
import logging
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import io
from typing import Dict, Any
from utils.insights import get_visualization_insights
from Test_Management.models import (
    FormativeAssessmentStatistic,
    AnalysisDocumentStatistic,
    StudentScoresStatistic,
    PredictedScore,
    TestTopicMapping
)
from django.core.files.base import ContentFile

# Setup logger
logger = logging.getLogger("arima_model.visualization")


# Visualization functions moved from arima_statistics.py
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
    fig, ax = plt.subplots(figsize=(10,6))

    
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
    
    plot_data = processed_data.copy()
    plot_data[value_column] = plot_data[value_column] * 100

    heatmap_data = plot_data.pivot_table(
        index="student_id",
        columns="test_number",
        values=value_column
    )

    fig, ax = plt.subplots(figsize=(15, 15))  # set fig size

    sns.heatmap(heatmap_data, annot=True, fmt=".1f",
                cmap="YlGnBu", linewidths=0.5, ax=ax)

    ax.set_title(title)
    ax.set_xlabel("Formative Assessment Number")
    ax.set_ylabel("Student ID")
    plt.tight_layout()

    # Save the plot to a BytesIO buffer instead of showing it
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
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
        # normalize the predicted score
        predicted_scores = [(predicted_score.score / predicted_score.max_score) * 100]
        student_data_score_percentage = student_data["normalized_scores"] * 100

        # Overlay: Actual scores
        sns.lineplot(x=student_data["test_number"].astype(int), y=student_data_score_percentage,
                     label="Actual Score", marker="o", color="blue", ax=ax)

        # Overlay: Predicted scores (same X but with single Y value, repeated for each test number)
        sns.lineplot(x=predicted_test_numbers, y=predicted_scores,
                     label="Predicted Score", marker="o", color="orange", ax=ax)

    else:
        # If no predicted score found, just plot the actual scores
        student_data_score_percentage = student_data["normalized_scores"] * 100
        sns.lineplot(x=student_data["test_number"].astype(int), y=student_data_score_percentage,
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

def generate_student_vs_class_chart(student_data, class_data):
    """
    Generate a stacked bar chart comparing a single student's scores against class averages across all formative assessments.
    
    Args:
        student_data: DataFrame containing scores for a specific student across all formative assessments
        class_data: DataFrame containing class average scores for all formative assessments
        
    Returns:
        BytesIO buffer containing the chart image
    """
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Sort by test number for chronological display
    student_data = student_data.sort_values(by="test_number")
    
    # Extract test numbers and student scores
    test_numbers = student_data["test_number"].tolist()
    student_scores = student_data["score"].tolist()

    
    # Calculate class averages for each test number
    class_averages = []
    for test_num in test_numbers:
        test_data = class_data[class_data["test_number"] == test_num]
        class_avg = test_data["score"].mean()
        class_averages.append(class_avg)

    # Set up the x positions
    x = np.arange(len(test_numbers))
    
    # For a clearer comparison, create a stacked representation
    comparison_data = []
    for i in range(len(student_scores)):
        if student_scores[i] >= class_averages[i]:
            # Student performed better than class average
            comparison_data.append({
                'test': test_numbers[i],
                'class_avg': class_averages[i],
                'student_additional': student_scores[i] - class_averages[i],
                'is_above': True
            })
        else:
            # Student performed worse than class average
            comparison_data.append({
                'test': test_numbers[i],
                'student_score': student_scores[i],
                'class_additional': class_averages[i] - student_scores[i],
                'is_above': False
            })
    
    # Create the visualization based on the comparison data
    for i, data in enumerate(comparison_data):
        if data['is_above']:
            # First bar: class average
            ax.bar(x[i], data['class_avg'], color='lightcoral', label='Class Average' if i == 0 else "")
            # Second bar: student's additional score above class average
            ax.bar(x[i], data['student_additional'], bottom=data['class_avg'], 
                  color='royalblue', label='Student Above Average' if i == 0 else "")
        else:
            # First bar: student score
            ax.bar(x[i], data['student_score'], color='royalblue', label='Student Score' if i == 0 else "")
            # Second bar: class average's additional score above student
            ax.bar(x[i], data['class_additional'], bottom=data['student_score'], 
                  color='lightcoral', alpha=0.5, label='Class Above Student' if i == 0 else "")
    
    # Add labels and title
    ax.set_title(f"Student Performance vs. Class Average")
    ax.set_xlabel("Formative Assessment Number")
    ax.set_ylabel("Score")
    ax.set_xticks(x)
    ax.set_xticklabels(test_numbers, rotation=45)
    
    # Add a legend without duplicates
    handles, labels = ax.get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    ax.legend(by_label.values(), by_label.keys(), loc='upper right')
    
    # Add annotations for the actual values
    for i, (score, avg) in enumerate(zip(student_scores, class_averages)):
        # Annotate student score
        ax.annotate(f'{score:.1f}', 
                    xy=(x[i], score), 
                    xytext=(0, 5 if score >= avg else -15),
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=8,
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="gray", alpha=0.7))
        
        # Annotate class average
        ax.annotate(f'Avg: {avg:.1f}', 
                    xy=(x[i], avg), 
                    xytext=(0, -15 if score >= avg else 5),
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=8, color='darkred',
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="gray", alpha=0.7))
    
    # Add a grid for better readability
    ax.grid(True, linestyle='--', alpha=0.7, axis='y')
    
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer

def generate_student_comparison_chart(fa_data, class_data, fa_number):
    """
    Generate a stacked bar chart comparing individual student scores against class average.
    
    Args:
        fa_data: DataFrame containing scores for the current formative assessment
        class_data: DataFrame containing class average scores for all formative assessments
        fa_number: The formative assessment number
        
    Returns:
        BytesIO buffer containing the chart image
    """
    fig, ax = plt.subplots(figsize=(20, 10))  # Larger figure for better readability
    
    # Sort by student ID for consistent display
    fa_data = fa_data.sort_values(by="student_id")
    
    # Extract student IDs and scores
    student_ids = fa_data["student_id"].tolist()
    student_scores = fa_data["score"].tolist()
    
    # Get class average for this FA
    class_avg = fa_data["score"].mean()
    
    # Set up the x positions
    x = np.arange(len(student_ids))
    
    # For a clearer comparison, create a stacked representation
    comparison_data = []
    for i in range(len(student_scores)):
        if student_scores[i] >= class_avg:
            # Student performed better than class average
            comparison_data.append({
                'student_id': student_ids[i],
                'class_avg': class_avg,
                'student_additional': student_scores[i] - class_avg,
                'is_above': True
            })
        else:
            # Student performed worse than class average
            comparison_data.append({
                'student_id': student_ids[i],
                'student_score': student_scores[i],
                'class_additional': class_avg - student_scores[i],
                'is_above': False
            })
    
    # Create the visualization based on the comparison data
    for i, data in enumerate(comparison_data):
        if data['is_above']:
            # First bar: class average
            ax.bar(x[i], data['class_avg'], color='lightcoral', label='Class Average' if i == 0 else "")
            # Second bar: student's additional score above class average
            ax.bar(x[i], data['student_additional'], bottom=data['class_avg'], 
                  color='royalblue', label='Student Above Average' if i == 0 else "")
        else:
            # First bar: student score
            ax.bar(x[i], data['student_score'], color='royalblue', label='Student Score' if i == 0 else "")
            # Second bar: class average's additional score above student
            ax.bar(x[i], data['class_additional'], bottom=data['student_score'], 
                  color='lightcoral', alpha=0.5, label='Class Above Student' if i == 0 else "")
    
    # Add labels and title
    ax.set_title(f"Student Scores vs. Class Average for FA {fa_number}")
    ax.set_xlabel("Student ID")
    ax.set_ylabel("Score")
    ax.set_xticks(x)
    ax.set_xticklabels(student_ids, rotation=45)
    
    # Add a legend without duplicates
    handles, labels = ax.get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    ax.legend(by_label.values(), by_label.keys(), loc='upper right')
    
    # Add annotations for the actual values
    for i, score in enumerate(student_scores):
        # Annotate student score
        ax.annotate(f'{score:.1f}', 
                    xy=(x[i], score), 
                    xytext=(0, 5 if score >= class_avg else -15),
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=8,
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="gray", alpha=0.7))
    
    # Add a reference line for the class average
    ax.axhline(y=class_avg, linestyle='--', color='darkred', alpha=0.7, label=f'Class Avg ({class_avg:.1f})')
    
    # Add a horizontal line for the passing threshold if available
    if 'passing_threshold' in fa_data.columns and not fa_data['passing_threshold'].isna().all():
        threshold = fa_data['passing_threshold'].iloc[0]
        ax.axhline(y=threshold, linestyle='--', color='darkgreen', label=f'Passing Threshold ({threshold:.1f})')
    
    # Update the legend to include reference lines
    ax.legend()
    
    # Add a grid for better readability
    ax.grid(True, linestyle='--', alpha=0.7, axis='y')
    
    plt.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png')
    plt.close(fig)
    buffer.seek(0)
    return buffer


class VisualizationManager:
    """
    Manager class for generating visualizations with accompanying insights.
    
    This class coordinates between the visualization functions and the insight
    generator to produce data-rich visualizations that help educators better
    understand student performance patterns.
    """
    
    @staticmethod
    def enrich_formative_assessment_visualizations(fa_data: pd.DataFrame, fa_statistic: FormativeAssessmentStatistic) -> Dict[str, Any]:
        """
        Generate and enrich all visualizations for a formative assessment with automatic insights.
        
        Args:
            fa_data: DataFrame for this specific formative assessment
            fa_statistic: Model instance to store results
            
        Returns:
            Dictionary of visualizations and insights
        """
        try:
            fa_number = fa_statistic.formative_assessment_number
            topic = fa_statistic.fa_topic.topic_name if fa_statistic.fa_topic else None
            
            # Generate visualizations
            result = {
                "score_distribution": generate_score_dist_chart(fa_data, fa_number),
                "box_plot": generate_boxplot(fa_data, fa_number),
                "bar_chart": generate_bar_chart(fa_data, fa_number),
                "scatter_plot": generate_scatterplot(fa_data, fa_number)
            }
            
            # Generate insights for distribution-based charts
            dist_insights = get_visualization_insights(
                'distribution', 
                fa_data["score"], 
                fa_number=fa_number, 
                topic=topic
            )
            
            # Generate insights for bar chart (student-by-student scores)
            bar_insights = get_visualization_insights(
                'bar_chart',
                fa_data["student_id"].tolist(),
                fa_data["score"].tolist(),
                fa_number=fa_number,
                topic=topic
            )
            
            # Store insights
            result["insights"] = {
                "distribution": dist_insights,
                "bar_chart": bar_insights
            }
            
            # Save visualizations to model if requested
            if hasattr(fa_statistic, 'histogram') and result["score_distribution"]:
                filename = f"histogram_{fa_statistic.analysis_document.pk}_{fa_number}.png"
                fa_statistic.histogram.save(
                    filename, ContentFile(result["score_distribution"].read()), save=True)
                
            if hasattr(fa_statistic, 'boxplot') and result["box_plot"]:
                filename = f"boxplot_{fa_statistic.analysis_document.pk}_{fa_number}.png"
                fa_statistic.boxplot.save(
                    filename, ContentFile(result["box_plot"].read()), save=True)
                
            if hasattr(fa_statistic, 'bar_chart') and result["bar_chart"]:
                filename = f"barchart_{fa_statistic.analysis_document.pk}_{fa_number}.png"
                fa_statistic.bar_chart.save(
                    filename, ContentFile(result["bar_chart"].read()), save=True)
                
            if hasattr(fa_statistic, 'scatterplot') and result["scatter_plot"]:
                filename = f"scatterplot_{fa_statistic.analysis_document.pk}_{fa_number}.png"
                fa_statistic.scatterplot.save(
                    filename, ContentFile(result["scatter_plot"].read()), save=True)
            
            return result
            
        except Exception as e:
            logger.error(f"Error enriching FA visualizations: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def enrich_student_visualizations(student_data: pd.DataFrame, student_statistic: StudentScoresStatistic) -> Dict[str, Any]:
        """
        Generate and enrich all visualizations for a student with automatic insights.
        
        Args:
            student_data: DataFrame for this specific student
            student_statistic: Model instance to store results
            
        Returns:
            Dictionary of visualizations and insights
        """
        try:
            analysis_document = student_statistic.analysis_document
            
            # Get predicted score if available
            predicted_score_obj = PredictedScore.objects.filter(
                student_id=student_statistic.student, 
                analysis_document=analysis_document
            ).first()
            
            predicted_score = predicted_score_obj.score if predicted_score_obj else None
            
            # Generate line chart
            line_chart = generate_student_line_chart(student_data, analysis_document)
            
            # Generate insights for line chart
            line_insights = get_visualization_insights(
                'line_chart',
                student_data["normalized_scores"] * 100,  # Convert to percentage
                student_data["test_number"].tolist(),
                predicted_score
            )
            
            result = {
                "line_chart": line_chart,
                "insights": {
                    "line_chart": line_insights
                }
            }
            
            # Get class data for comparison chart
            try:
                # Get all formative assessment scores for the document to facilitate class comparison
                from Test_Management.models import FormativeAssessmentScore
                
                all_scores = FormativeAssessmentScore.objects.filter(
                    analysis_document=analysis_document
                ).values('formative_assessment_number', 'score')
                
                if all_scores.exists():
                    # Create a DataFrame for class data
                    class_data = pd.DataFrame(list(all_scores))
                    class_data.rename(columns={'formative_assessment_number': 'test_number'}, inplace=True)
                    
                    # Generate student vs class comparison chart
                    comparison_chart = generate_student_vs_class_chart(student_data, class_data)
                    
                    # Get test numbers and scores for insights
                    test_numbers = student_data["test_number"].tolist()
                    student_scores = student_data["score"].tolist()
                    
                    # Calculate class averages for each test
                    class_averages = []
                    for test_num in test_numbers:
                        test_data = class_data[class_data['test_number'] == test_num]
                        class_avg = test_data['score'].mean()
                        class_averages.append(class_avg)
                    
                    # Generate insights for comparison chart
                    comparison_insights = get_visualization_insights(
                        'student_vs_class_comparison',
                        test_numbers,
                        student_scores,
                        class_averages,
                        student_id=student_statistic.student.student_id,
                        student_name=f"{student_statistic.student.first_name} {student_statistic.student.last_name}"
                    )
                    
                    # Add to result
                    result["performance_comparison_chart"] = comparison_chart
                    result["insights"]["comparison"] = comparison_insights
                    
                    # Save comparison chart to model if attribute exists
                    if hasattr(student_statistic, 'performance_comparison_chart') and comparison_chart:
                        from django.core.files.base import ContentFile
                        filename = f"comparison_{analysis_document.pk}_{student_statistic.student.student_id}.png"
                        student_statistic.performance_comparison_chart.save(
                            filename, ContentFile(comparison_chart.read()), save=True)
            except Exception as e:
                logger.error(f"Error generating student vs class comparison: {str(e)}")
            
            # Save line chart to model if attribute exists
            if hasattr(student_statistic, 'lineplot') and line_chart:
                from django.core.files.base import ContentFile
                filename = f"lineplot_{analysis_document.pk}_{student_statistic.student.student_id}.png"
                student_statistic.lineplot.save(
                    filename, ContentFile(line_chart.read()), save=True)
            
            return result
            
        except Exception as e:
            logger.error(f"Error enriching student visualizations: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def enrich_document_visualizations(processed_data: pd.DataFrame, document_statistic: AnalysisDocumentStatistic) -> Dict[str, Any]:
        """
        Generate and enrich all document-level visualizations with automatic insights.
        
        Args:
            processed_data: DataFrame containing all data for the document
            document_statistic: Model instance to store results
            
        Returns:
            Dictionary of visualizations and insights
        """
        try:
            # Generate heatmap
            heatmap = generate_heatmap(
                processed_data, 
                "normalized_scores", 
                title="Heatmap of Normalized Scores of Students per FA"
            )
            
            # Generate insights
            heatmap_insights = get_visualization_insights(
                'heatmap', 
                processed_data, 
                value_column="normalized_scores"
            )
            
            # Get overall document insights
            assessment_count = processed_data["test_number"].nunique()
            student_count = processed_data["student_id"].nunique()
            
            document_stats = {
                "mean": document_statistic.mean,
                "median": document_statistic.median,
                "standard_deviation": document_statistic.standard_deviation,
                "minimum": document_statistic.minimum,
                "maximum": document_statistic.maximum,
                "mean_passing_threshold": document_statistic.mean_passing_threshold
            }
            
            overall_insights = get_visualization_insights(
                'overall',
                document_stats,
                assessment_count,
                student_count
            )
            
            result = {
                "heatmap": heatmap,
                "insights": {
                    "heatmap": heatmap_insights,
                    "overall": overall_insights
                },
                "document_statistics": document_stats,
            }
            
            # Save to model if requested
            if hasattr(document_statistic, 'heatmap') and heatmap:
                filename = f"heatmap_{document_statistic.analysis_document.pk}.png"
                document_statistic.heatmap.save(
                    filename, ContentFile(heatmap.read()), save=True)
            
            return result
            
        except Exception as e:
            logger.error(f"Error enriching document visualizations: {str(e)}")
            return {"error": str(e)}
            
            
# Convenience methods for direct use

def get_fa_visualizations_with_insights(fa_data: pd.DataFrame, fa_statistic: FormativeAssessmentStatistic) -> Dict[str, Any]:
    """Convenience method to get visualizations and insights for a formative assessment."""
    return VisualizationManager.enrich_formative_assessment_visualizations(fa_data, fa_statistic)

def get_student_visualizations_with_insights(student_data: pd.DataFrame, student_statistic: StudentScoresStatistic) -> Dict[str, Any]:
    """Convenience method to get visualizations and insights for a student."""
    return VisualizationManager.enrich_student_visualizations(student_data, student_statistic)

def get_document_visualizations_with_insights(processed_data: pd.DataFrame, document_statistic: AnalysisDocumentStatistic) -> Dict[str, Any]:
    """Convenience method to get visualizations and insights for an analysis document."""
    return VisualizationManager.enrich_document_visualizations(processed_data, document_statistic)