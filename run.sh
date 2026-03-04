#!/bin/bash

# Navigate to the project's directory
BASEDIR="$HOME/Dev/esptfa-arima_copy"
cd "$BASEDIR"

# Activate the virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment (.venv) not found. Please create one with 'python3 -m venv .venv' and install requirements."
    exit 1
fi

# Change directory to the project for the backend
cd esptfa_arima 

# Set the Django settings module to ensure it's picked up by the application
export DJANGO_SETTINGS_MODULE=esptfaARIMA.settings_ci

# Start the application server via the entrypoint script
echo "Starting Application Server (Linux/macOS)..."
python run_app.py
