#!/bin/bash
set -e

echo "=== GESP Exam Platform Seed Script ==="

# Wait for database
echo "Waiting for database..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "  Retrying in 2s..."
  sleep 2
done
echo "Database ready!"

# Check if questions exist
QUESTION_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.question.count().then(c => { console.log(c); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$QUESTION_COUNT" -gt "0" ]; then
  echo "Database already has $QUESTION_COUNT questions. Skipping import."
else
  echo "Generating mock data..."
  cd /app/scraper && node -e "import('./dist/generate-mock-data.js')" || pnpm mock-data
  
  echo "Importing questions..."
  cd /app/scraper && node -e "import('./dist/import-to-db.js')" || pnpm import
fi

echo "=== Seed complete ==="
