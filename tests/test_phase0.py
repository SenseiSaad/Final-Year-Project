"""Phase 0 tests: config loading, SQLite schema, doctor checks, and no-HTML UI rule."""

from pathlib import Path

import pytest

from core.config import BASE_DIR, get_secret, load_config, load_env, load_prompt, load_texts
from core.db import execute_sql, fetch_one, get_meta, init_db, insert_sql, set_meta
import doctor


def test_config_and_texts_load():
    cfg = load_config()
    texts = load_texts()
    assert cfg["app"]["app_name"] == "DocuTrust AI"
    assert cfg["rag"]["bm25_weight"] + cfg["rag"]["vector_weight"] == pytest.approx(1.0)
    assert texts["welcome"]["hero_title"]
    assert texts["login"]["heading"]


def test_load_env_reads_temp_file_without_overriding(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text('TEST_KEY_A="alpha"\n# comment\nTEST_KEY_B=beta\n', encoding="utf-8")
    monkeypatch.setenv("TEST_KEY_A", "already-set")
    monkeypatch.delenv("TEST_KEY_B", raising=False)
    load_env(env_file)
    assert get_secret("TEST_KEY_A") == "already-set"
    assert get_secret("TEST_KEY_B") == "beta"


def test_get_secret_raises_when_missing(monkeypatch):
    monkeypatch.delenv("NONEXISTENT_DOCUTRUST_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        get_secret("NONEXISTENT_DOCUTRUST_SECRET")


def test_db_init_creates_all_tables_and_helpers(tmp_path):
    db_file = tmp_path / "test.db"
    init_db(db_file)

    rows = fetch_one(
        db_file,
        "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    assert rows["cnt"] == 10

    set_meta(db_file, "embed_model", "nomic-embed-text")
    assert get_meta(db_file, "embed_model") == "nomic-embed-text"

    uid = insert_sql(
        db_file,
        "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        ("alice", "hash", "employee", "2026-11-14T00:00:00"),
    )
    assert uid >= 1
    changed = execute_sql(db_file, "UPDATE users SET department = ? WHERE id = ?", ("HR", uid))
    assert changed == 1
    user = fetch_one(db_file, "SELECT username, department FROM users WHERE id = ?", (uid,))
    assert user == {"username": "alice", "department": "HR"}


def test_prompts_load():
    answer_prompt = load_prompt("answer")
    refuse_prompt = load_prompt("refuse")
    assert "{context}" in answer_prompt
    assert "{question}" in answer_prompt
    assert "{refuse_message}" in answer_prompt
    assert len(refuse_prompt) > 10


def test_doctor_checks_and_unreachable_ollama():
    ok_py, _ = doctor.check_python()
    assert ok_py

    ok_dj, _ = doctor.check_django()
    assert ok_dj

    cfg = load_config()
    cfg["app"]["ollama_host"] = "http://127.0.0.1:19999"
    ok_ol, msg_ol = doctor.check_ollama(cfg)
    assert not ok_ol
    assert "unavailable" in msg_ol.lower()


def test_no_html_or_css_in_ui_files():
    ui_files = [BASE_DIR / "app.py", *sorted((BASE_DIR / "pages").glob("*.py"))]
    forbidden = ("unsafe_allow_html", "<style", "<script", "<div", "<span")
    for path in ui_files:
        text = path.read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in text, f"Forbidden HTML/CSS token {token} found in {path.name}"


def test_env_example_and_run_script_ready():
    env_example = (BASE_DIR / ".env.example").read_text(encoding="utf-8")
    for key in ("DOCUTRUST_ADMIN_PASSWORD", "DOCUTRUST_ATTENDANCE_SECRET", "DOCUTRUST_DEMO_PASSWORD"):
        assert key in env_example
    run_sh = BASE_DIR / "run.sh"
    assert run_sh.exists()
    assert run_sh.stat().st_mode & 0o111
