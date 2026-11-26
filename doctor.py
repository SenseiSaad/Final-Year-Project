"""Health checks for the Django demo and optional local Ollama backend."""

import importlib
import json
import shutil
import subprocess
from pathlib import Path
import sys
import urllib.error
import urllib.request

from core.config import BASE_DIR, load_config


def check_python() -> tuple[bool, str]:
    """Ensure Python 3.11+ is active (needed for stdlib tomllib)."""
    ver = sys.version_info
    ok = (ver.major, ver.minor) >= (3, 11)
    return ok, f"Python {ver.major}.{ver.minor}.{ver.micro}"


def check_files() -> tuple[bool, str]:
    """Verify that the Django backend and the Next.js website (web/) are in place."""
    required = [
        BASE_DIR / "manage.py",
        BASE_DIR / "docutrust_site" / "settings.py",
        BASE_DIR / "docutrust_site" / "urls.py",
        BASE_DIR / "web" / "package.json",
        BASE_DIR / "web" / "src" / "app" / "(site)" / "page.tsx",
    ]
    missing = [str(path.relative_to(BASE_DIR)) for path in required if not path.is_file()]
    if missing:
        return False, f"Missing project files: {', '.join(missing)}"
    try:
        load_config()
    except Exception as exc:
        return False, f"Legacy project config unavailable: {exc}"
    return True, "Django backend, Next.js website and config OK"


def check_website() -> tuple[bool, str]:
    """Verify Node.js is available for the Next.js website in web/."""
    node = shutil.which("node")
    if not node:
        return False, "Node.js not found. Install Node 20 or newer to run the website"
    version = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip()
    if not (BASE_DIR / "web" / "node_modules").is_dir():
        return True, f"Node {version}; website packages will be installed on first run"
    return True, f"Node {version}, website packages installed"


def check_packages(cfg: dict | None = None) -> tuple[bool, str]:
    """Verify the Django application and legacy AI dependencies import."""
    needed = ["django", "streamlit", "ollama", "pypdf", "docx", "rank_bm25", "numpy", "bcrypt"]
    if cfg and cfg.get("attendance", {}).get("qr_enabled"):
        needed.append("qrcode")
    missing = []
    for mod in needed:
        try:
            importlib.import_module(mod)
        except ImportError:
            missing.append(mod)
    if missing:
        return False, f"Missing packages: {', '.join(missing)}"
    return True, f"All {len(needed)} required libraries installed"


def check_django() -> tuple[bool, str]:
    """Run Django's system checks without touching the legacy SQLite database."""
    try:
        import os
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "docutrust_site.settings")
        import django
        django.setup()
        from django.core.management import call_command

        call_command("check", verbosity=0)
        return True, "Django system checks passed"
    except Exception as exc:
        return False, f"Django error: {exc}"


def fetch_ollama_models(host: str) -> list[str]:
    """Query Ollama /api/tags and return pulled model names."""
    url = f"{host.rstrip('/')}/api/tags"
    with urllib.request.urlopen(url, timeout=3) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return [m["name"] for m in data.get("models", []) if "name" in m]


def _has_model(available: list[str], wanted: str) -> bool:
    """Match exact tag or Ollama's implicit ':latest' suffix."""
    return wanted in available or f"{wanted}:latest" in available


def check_ollama(cfg: dict) -> tuple[bool, str]:
    """Report configured Ollama readiness; not required to view this public demo."""
    host = cfg["app"]["ollama_host"]
    chat_m = cfg["models"]["chat_model"]
    embed_m = cfg["models"]["embed_model"]
    try:
        models = fetch_ollama_models(host)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return False, f"Optional AI backend unavailable at {host} ({exc})"
    missing = [m for m in (chat_m, embed_m) if not _has_model(models, m)]
    if missing:
        return False, f"Ollama running, missing configured models: {', '.join(missing)}"
    return True, f"Ollama ready ({chat_m}, {embed_m})"


def run_checks() -> list[tuple[str, bool, str]]:
    """Run local startup diagnostics and return (label, passed, detail) tuples."""
    results = [("Python", *check_python()), ("Django files", *check_files())]
    try:
        cfg = load_config()
    except Exception as exc:
        results.append(("Legacy config", False, str(exc)))
        cfg = None
    results.append(("Dependencies", *check_packages(cfg)))
    results.append(("Django", *check_django()))
    results.append(("Website", *check_website()))
    if cfg is not None:
        results.append(("Optional Ollama", *check_ollama(cfg)))
    return results


def main() -> int:
    """Print check results; optional Ollama warnings do not block local site startup."""
    print(f"DocuTrust AI Doctor ({BASE_DIR})")
    results = run_checks()
    all_required_ok = True
    for name, ok, msg in results:
        tag = "PASS" if ok else "WARN" if name == "Optional Ollama" else "FAIL"
        print(f"[{tag}] {name}: {msg}")
        if not ok and name != "Optional Ollama":
            all_required_ok = False
    return 0 if all_required_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
