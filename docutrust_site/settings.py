"""Django settings for the local DocuTrust public demo."""

import os
from pathlib import Path

from core.config import load_env

BASE_DIR = Path(__file__).resolve().parent.parent
load_env()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "docutrust-local-demo-insecure-key-change-before-deployment")
DEBUG = os.environ.get("DJANGO_DEBUG", "1").lower() in {"1", "true", "yes"}
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "[::1]", "testserver"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts",
    "site_pages",
]

# Custom user model chosen before the first migration so role/department
# fields from the FYP schema are carried forward without later rework.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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
        "NAME": os.environ.get("DOCUTRUST_DJANGO_DB", str(BASE_DIR / "data" / "docutrust_django.sqlite3")),
        "OPTIONS": {"timeout": 20},
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
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# A portfolio/demo site, not a user account surface. Keep it stateless for now.
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
