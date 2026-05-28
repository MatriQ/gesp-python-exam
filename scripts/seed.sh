#!/bin/bash
set -e

echo "=== GESP Exam Platform Seed Script ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect environment: Docker (/app) or local dev
if [ -d "/app/scraper" ]; then
  SCRAPER_DIR="/app/scraper"
else
  SCRAPER_DIR="$PROJECT_DIR/scraper"
fi

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
  echo "=== Seed complete ==="
  exit 0
fi

if [ -n "$MOCK" ]; then
  # Mock mode: generate mock data
  echo "MOCK=1 detected — generating mock data..."
  cd "$SCRAPER_DIR" && pnpm mock-data
  echo "Importing mock questions..."
  cd "$SCRAPER_DIR" && pnpm import
else
  # Real pipeline mode: try PDF pipeline first
  echo "Attempting real PDF pipeline..."

  cd "$SCRAPER_DIR"

  # Check if Python and dependencies are available
  PYTHON_AVAILABLE=false
  if command -v python3 &>/dev/null; then
    if python3 -c "import requests; import bs4" 2>/dev/null; then
      PYTHON_AVAILABLE=true
    fi
  fi

  # Check if API key is available for LLM extraction
  API_KEY_AVAILABLE=false
  if [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$CLAUDE_API_KEY" ]; then
    API_KEY_AVAILABLE=true
  fi

  if [ "$PYTHON_AVAILABLE" = true ] && [ "$API_KEY_AVAILABLE" = true ]; then
    echo "Running full pipeline (download → parse → import)..."
    pnpm pipeline || {
      echo "⚠ Pipeline failed, falling back to mock data..."
      pnpm mock-data
      pnpm import
    }
  elif [ "$API_KEY_AVAILABLE" = true ] && [ -d "$SCRAPER_DIR/pdfs" ] && [ "$(find "$SCRAPER_DIR/pdfs" -name '*.pdf' 2>/dev/null | head -1)" ]; then
    echo "Python unavailable but PDFs exist. Running parse + import only..."
    pnpm pipeline --skip-download || {
      echo "⚠ Pipeline failed, falling back to mock data..."
      pnpm mock-data
      pnpm import
    }
  else
    echo "⚠ Prerequisites not met for real pipeline (need Python + API key)."
    echo "Falling back to mock data generation..."
    pnpm mock-data
    pnpm import
  fi
fi

echo "=== Seed complete ==="
