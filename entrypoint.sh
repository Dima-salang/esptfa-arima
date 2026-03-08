#!/bin/sh
# entrypoint.sh — runs before the main process on every container start.
# Using /bin/sh (POSIX) for maximum compatibility with slim base images.
set -e

echo ">>> Running database migrations..."
python manage.py migrate --noinput

echo ">>> Starting Daphne ASGI server..."
# exec replaces the shell process with daphne so signals (SIGTERM, etc.)
# are forwarded directly to the server instead of being swallowed by sh.
exec daphne -b 0.0.0.0 -p 8000 esptfaARIMA.asgi:application
