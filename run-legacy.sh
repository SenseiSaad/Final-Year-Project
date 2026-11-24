#!/usr/bin/env bash
# Legacy transition entry point: starts the previous Streamlit shell locally.
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Run ./run.sh once first so the virtual environment is created."
  exit 1
fi

exec .venv/bin/streamlit run app.py \
  --server.address=127.0.0.1 \
  --server.headless=true \
  --browser.gatherUsageStats=false
