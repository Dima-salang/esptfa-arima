from celery import shared_task
from Test_Management.models import AnalysisDocument
from arima_model.arima_model import arima_driver


@shared_task
def process_analysis_document(document_id):
    """Run ARIMA on uploaded document asynchronously."""
    try:
        document = AnalysisDocument.objects.get(analysis_document_id=document_id)
        arima_driver(document)  # Run ARIMA in the background
        print("Processing completed")
    except Exception as e:
        return f"Error: {str(e)}"
