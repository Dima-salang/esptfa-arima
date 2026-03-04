@echo off
SET PROJECT_PATH=%USERPROFILE%\Documents\Dev\esptfa-arima_copy
SET BASEDIR=%PROJECT_PATH%
cd /d %BASEDIR%

REM Check for virtual environment and activate it
IF EXIST .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) ELSE IF EXIST venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) ELSE (
    echo Virtual environment (.venv or venv) not found.
    echo Please create one and install requirements.
    pause
    exit /b 1
)

REM Change directory to the project for the backend
cd esptfa_arima 

REM Set the Django settings module
set DJANGO_SETTINGS_MODULE=esptfaARIMA.settings_ci

REM Start the application server
echo Starting Application Server (Windows)...
python run_app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with error code %ERRORLEVEL%
    pause
)
