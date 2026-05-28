#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/server && npx prisma migrate deploy

echo "Starting server..."
cd /app && exec "$@"
