# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────
# Stage 1 – Build the React frontend
# ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Install dependencies first (layer-cache friendly)
COPY frontend/esptfa-arima-react/package*.json ./
RUN npm ci

# Copy source and build for production.
# Vite is configured to use "/static/" as the base in build mode,
# which matches Django's STATIC_URL and STATICFILES_DIRS setup in settings_ci.py.
COPY frontend/esptfa-arima-react/ ./
RUN npm run build


# ─────────────────────────────────────────────────────────────────
# Stage 2 – Python application image
# ─────────────────────────────────────────────────────────────────
ARG PYTHON_VERSION=3.10.12
FROM python:${PYTHON_VERSION}-slim AS base

# Prevents Python from writing .pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout/stderr so logs appear immediately.
ENV PYTHONUNBUFFERED=1

# Point Django at the CI/CD settings file (mirrors run.sh behaviour).
ENV DJANGO_SETTINGS_MODULE=esptfaARIMA.settings_ci

WORKDIR /app

# ── Non-privileged user (security best practice) ──────────────────
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# ── System dependencies needed by some Python wheels ──────────────
# libpq-dev  → psycopg2
# gcc/g++    → statsmodels / scipy native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# ── Python dependencies (cached separately from source code) ───────
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

# ── Application source ─────────────────────────────────────────────
COPY esptfa_arima/ /app/esptfa_arima/

# ── React built assets ─────────────────────────────────────────────
# Placed at the path settings_ci.py resolves REACT_DIST_DIR to:
#   BASE_DIR.parent / "frontend" / "esptfa-arima-react" / "dist"
#   → /app/frontend/esptfa-arima-react/dist
COPY --from=frontend-builder /frontend/dist /app/frontend/esptfa-arima-react/dist/

# Pre-create log directories so RotatingFileHandler can open them
# even before any log rotation has occurred ("delay=True" still
# requires the parent directory to exist at startup).
RUN mkdir -p /app/esptfa_arima/logs/django \
             /app/esptfa_arima/logs/arima \
             /app/esptfa_arima/media \
             /app/esptfa_arima/staticfiles \
 && chown -R appuser /app/esptfa_arima/logs \
                     /app/esptfa_arima/media \
                     /app/esptfa_arima/staticfiles

# ── Collect static files so Django can serve them ─────────────────
# We run this as root (before USER switch) so it has write access.
WORKDIR /app/esptfa_arima
RUN python manage.py collectstatic --noinput

# Switch to non-privileged user for the actual process.
USER appuser

EXPOSE 8000

# Daphne is the ASGI server wired up via ASGI_APPLICATION in settings_ci.py.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "esptfaARIMA.asgi:application"]