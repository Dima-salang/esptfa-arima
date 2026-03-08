# syntax=docker/dockerfile:1

# Global ARGs — must be declared BEFORE the first FROM so that they are
# accessible to all subsequent FROM instructions in multi-stage builds.
ARG PYTHON_VERSION=3.10.12
# Dummy secret used ONLY during the build-time collectstatic step.
# The real key is supplied at runtime via the .env file / compose env_file.
# Override at build time with: docker build --build-arg DJANGO_SECRET_KEY=...
ARG DJANGO_SECRET_KEY='django-insecure-#x@jt9fnoa0sg=h0_^ytl^$etsj&_)$mln(c1tgbvay_li$xeq'

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
FROM python:${PYTHON_VERSION} AS base

# Re-declare global ARGs inside this stage so their values are
# accessible to RUN instructions. Global ARGs are only automatically
# available to FROM; all other instructions need a local re-declaration.
ARG DJANGO_SECRET_KEY

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

# ── Entrypoint script ─────────────────────────────────────────────
# Copied and made executable while still root so chmod succeeds.
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# ── React built assets ─────────────────────────────────────────────
# Placed at the path settings_ci.py resolves REACT_DIST_DIR to:
#   BASE_DIR.parent / "frontend" / "esptfa-arima-react" / "dist"
#   → /app/frontend/esptfa-arima-react/dist
COPY --from=frontend-builder /frontend/dist /app/frontend/esptfa-arima-react/dist/

# Pre-create all runtime-writable directories and the SQLite database file,
# then hand ownership to appuser before any Django command runs.
#
# IMPORTANT: The SQLite file must be created here (as an empty file via touch)
# so that after chown it is appuser-owned in the image layer. Docker copies
# image ownership into a new named volume on first initialisation — if we let
# Django create the file implicitly it does so as root (this RUN block still
# runs as root), which is what caused "attempt to write a readonly database".
RUN mkdir -p /app/esptfa_arima/db \
             /app/esptfa_arima/logs/django \
             /app/esptfa_arima/logs/arima \
             /app/esptfa_arima/media \
             /app/esptfa_arima/staticfiles \
 && touch /app/esptfa_arima/db/esptfa_arima \
 && chown -R appuser:appuser \
             /app/esptfa_arima/db \
             /app/esptfa_arima/logs \
             /app/esptfa_arima/media \
             /app/esptfa_arima/staticfiles

# Switch to non-privileged user NOW — all subsequent steps (including
# collectstatic) will run as appuser so no files are created as root.
USER appuser

# ── Collect static files so Django can serve them ─────────────────
# DJANGO_SECRET_KEY is injected from the build ARG — collectstatic only
# needs Django to initialise cleanly; no real secret is required here.
WORKDIR /app/esptfa_arima
RUN DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY} python manage.py collectstatic --noinput

# Switch to non-privileged user for the actual process.
USER appuser

EXPOSE 8000

# entrypoint.sh runs migrate then execs daphne, ensuring the schema
# is always up-to-date before the server accepts any traffic.
ENTRYPOINT ["/app/entrypoint.sh"]