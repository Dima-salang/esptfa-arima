from Test_Management.models import AnalysisDocument
from arima_model.arima_model import arima_driver
import logging

logger = logging.getLogger(__name__)

def process_analysis_document(document_id):
    """Run ARIMA on uploaded document asynchronously."""
    try:
        document = AnalysisDocument.objects.get(analysis_document_id=document_id)
        document_status = arima_driver(document)  # Run ARIMA in the background

        # Update the document status based on the processing result
        document.status = document_status  # Assuming arima_driver returns a boolean status
        document.save()

        final_status = document.status
        status_text = "Analyzed" if final_status else "Processing Error"


        if not final_status:
            document.delete()
    except AnalysisDocument.DoesNotExist:
        logger.error(f"Document with ID {document_id} does not exist.")
        raise
    except Exception as e:
        logger.error(f"Error during ARIMA processing for document {document_id}: {str(e)}", exc_info=True) # Log traceback
        if document: # Check if document was fetched before the error
            try:
                # Attempt to mark status as failed (or keep as False if not changed)
                document.status = False # Mark as failed explicitly if needed
                document.save()

            except Exception as inner_e:
                 logger.error(f"Failed to send error event for document {document_id}: {str(inner_e)}")
        raise # Re-raise the exception
