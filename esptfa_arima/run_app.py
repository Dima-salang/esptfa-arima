import os
import sys
import webbrowser
import platform
import logging
from threading import Timer
from dotenv import load_dotenv

# Ensure the settings module is set to settings_ci as requested
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "esptfaARIMA.settings_ci")

# Setup logging to console for simplicity in the run script
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def open_browser():
    """Timer callback to open the browser once the server is likely up."""
    logger.info("Opening browser...")
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    # Add current and parent directory to sys.path to resolve imports correctly
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(current_dir)
    sys.path.append(os.path.dirname(current_dir))

    # Load environment variables from .env located in the same folder as this script
    env_path = os.path.join(current_dir, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logger.info(f"Loaded environment variables from {env_path}")

    # Start browser timer
    Timer(1.5, open_browser).start()

    # Choose different servers based on OS for best performance and compatibility
    try:
        if platform.system() == "Windows":
            # Waitress is the recommended production WSGI server for Windows
            logger.info("Starting Waitress (Windows) on http://127.0.0.1:8000...")
            from waitress import serve
            from django.core.wsgi import get_wsgi_application

            application = get_wsgi_application()
            serve(application, host="127.0.0.1", port=8000)
        else:
            # On Linux/macOS, Daphne (ASGI) is much better because it correctly
            # handles django-eventstream (SSE) without blocking threads.
            try:
                from daphne.server import Server
                from esptfaARIMA.asgi import application

                logger.info("Starting Daphne (Linux/macOS) on http://127.0.0.1:8000...")
                # We use Daphne internally here to keep everything in one python process
                server = Server(
                    application=application,
                    endpoints=["tcp:port=8000:interface=127.0.0.1"],
                )
                server.run()
            except ImportError:
                # Fallback to waitress if daphne is not installed for some reason
                logger.warning("Daphne not found. Falling back to Waitress...")
                from waitress import serve
                from django.core.wsgi import get_wsgi_application

                application = get_wsgi_application()
                serve(application, host="127.0.0.1", port=8000)

    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)
