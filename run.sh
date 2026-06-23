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

# do bun run build
cd "$BASEDIR/frontend/esptfa-arima-react"

bun run build

# Change directory to the project for the backend
cd "$BASEDIR/esptfa_arima"

# Set the Django settings module to ensure it's picked up by the application
export DJANGO_SETTINGS_MODULE=esptfaARIMA.settings_ci

# migrate
echo "Migrating database..."
python manage.py migrate --noinput

# Start the application server via the entrypoint script
echo "Starting Application Server (Linux/macOS)..."
python run_app.py
