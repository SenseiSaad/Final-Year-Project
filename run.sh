#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Create virtual environment automatically on a fresh machine if missing
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment (.venv)..."
  python3 -m venv .venv
  if command -v uv >/dev/null 2>&1; then
    uv pip install --python .venv/bin/python -r requirements.txt
  else
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
  fi
fi

# Install newly added project dependencies when the environment already exists
if ! .venv/bin/python -c 'import django' >/dev/null 2>&1; then
  echo "Installing Django for the new web interface..."
  if command -v uv >/dev/null 2>&1; then
    uv pip install --python .venv/bin/python 'Django>=5.2,<5.3'
  else
    .venv/bin/pip install 'Django>=5.2,<5.3'
  fi
fi

# Preserve existing local secrets; create the example file only when needed
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Review local settings before demoing."
fi

# Non-blocking doctor report: optional Ollama absence does not stop the site
.venv/bin/python doctor.py || echo "Required startup checks reported a problem. Review above."

# Install the website packages on a fresh machine
if [ ! -d "web/node_modules" ]; then
  echo "Installing website packages (web/)..."
  npm --prefix web install
fi

port_busy() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}
for port in 8300 3100; do
  if port_busy "$port"; then
    echo "Port $port is already in use. Stop the program using it, then run ./run.sh again."
    echo "  Find it with: lsof -i :$port"
    exit 1
  fi
done

# Both servers are deliberately available only on this machine.
# Django (backend API and admin) on 8300 avoids the system service already bound to 8000.
.venv/bin/python manage.py runserver 127.0.0.1:8300 &
DJANGO_PID=$!
# Stop Django and its auto-reloader child when the script exits
trap 'pkill -P "$DJANGO_PID" 2>/dev/null; kill "$DJANGO_PID" 2>/dev/null' EXIT INT TERM

echo ""
echo "  Website:  http://127.0.0.1:3100"
echo "  Admin:    http://127.0.0.1:8300/admin/"
echo ""

# The Next.js website runs in the foreground; Ctrl+C stops both servers
npm --prefix web run dev -- --hostname 127.0.0.1 --port 3100
