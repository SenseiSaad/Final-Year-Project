"""Django settings for the local DocuTrust public demo."""

import os
from pathlib import Path

from core.config import load_env

BASE_DIR = Path(__file__).resolve().parent.parent
load_env()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or "docutrust-local-demo-insecure-key-change-before-deployment"
DEBUG = os.environ.get("DJANGO_DEBUG", "1").lower() in {"1", "true", "yes"}
if not DEBUG and SECRET_KEY.startswith("docutrust-local-demo"):
    raise RuntimeError("Set DJANGO_SECRET_KEY before running with DJANGO_DEBUG=0.")
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "[::1]", "testserver"] + [
    host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts",
    "site_pages",
    "workspace.apps.WorkspaceConfig",
]

# Custom user model chosen before the first migration so role/department
# fields from the FYP schema are carried forward without later rework.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "workspace.cors.WorkspaceCorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "docutrust_site.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "docutrust_site.wsgi.application"
ASGI_APPLICATION = "docutrust_site.asgi.application"

# Keep Django's development database separate from the legacy Streamlit SQLite DB.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DOCUTRUST_DJANGO_DB") or str(BASE_DIR / "data" / "docutrust_django.sqlite3"),
        # IMMEDIATE takes the write lock when a transaction starts, so the audit
        # hash chain cannot hand two writers the same sequence number.
        "OPTIONS": {"timeout": 20, "transaction_mode": "IMMEDIATE"},
    }
}

AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "static_collected"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("DOCUTRUST_MEDIA_ROOT") or BASE_DIR / "media").resolve()
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Exact origins only. The no-auth demo API does not allow cookies/credentials.
WORKSPACE_CORS_ALLOWED_ORIGINS = tuple(
    origin.strip().rstrip("/")
    for origin in os.environ.get(
        "DOCUTRUST_CORS_ALLOWED_ORIGINS",
        "http://127.0.0.1:3100,http://localhost:3100,http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if origin.strip() and origin.strip() != "*"
)

# A portfolio/demo site, not a user account surface. Keep it stateless for now.
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
