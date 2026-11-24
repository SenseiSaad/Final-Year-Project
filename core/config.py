"""Load settings, UI texts, prompts, and secrets from project files."""

import os
from pathlib import Path
import tomllib

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env(env_path: Path | None = None) -> None:
    """Read key=value pairs from .env without overriding existing env vars."""
    target = env_path or (BASE_DIR / ".env")
    if not target.exists():
        return
    for raw_line in target.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        clean_val = val.strip().strip('"').strip("'")
        # setdefault lets shell or pytest override .env safely
        os.environ.setdefault(key.strip(), clean_val)


def load_config(config_path: Path | None = None) -> dict:
    """Return parsed config.toml values as a plain dictionary."""
    load_env()
    target = config_path or (BASE_DIR / "config.toml")
    with target.open("rb") as fh:
        return tomllib.load(fh)


def load_texts(texts_path: Path | None = None) -> dict:
    """Return UI wording from texts.toml so labels stay outside Python."""
    target = texts_path or (BASE_DIR / "texts.toml")
    with target.open("rb") as fh:
        return tomllib.load(fh)


def load_prompt(name: str, prompts_dir: Path | None = None) -> str:
    """Read a prompt template from prompts/<name>.txt."""
    folder = prompts_dir or (BASE_DIR / "prompts")
    target = folder / f"{name}.txt"
    return target.read_text(encoding="utf-8").strip()


def get_secret(key: str) -> str:
    """Fetch a required secret from environment or .env, failing loudly if missing."""
    load_env()
    value = os.environ.get(key, "").strip()
    if not value:
        raise RuntimeError(f"Missing secret '{key}'. Add it to .env (see .env.example).")
    return value


def resolve_db_path(cfg: dict) -> Path:
    """Turn config db_path into an absolute path rooted at the project folder."""
    raw = Path(cfg["app"]["db_path"])
    if raw.is_absolute():
        return raw
    return BASE_DIR / raw
