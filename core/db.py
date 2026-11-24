"""Plain sqlite3 connection, schema setup, and simple SQL helpers."""

from pathlib import Path
import sqlite3

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee',
    department TEXT NOT NULL DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, file_type TEXT NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id), department TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private', status TEXT NOT NULL DEFAULT 'indexing',
    is_okf INTEGER NOT NULL DEFAULT 0, embed_model TEXT NOT NULL DEFAULT '',
    chunk_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL, content TEXT NOT NULL,
    embedding BLOB, token_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS document_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT, created_at TEXT NOT NULL,
    UNIQUE(doc_id, shared_with_user_id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    question TEXT NOT NULL, answer TEXT NOT NULL,
    sources_json TEXT NOT NULL DEFAULT '[]', refused INTEGER NOT NULL DEFAULT 0,
    rating INTEGER, response_ms INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    att_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present',
    marked_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
    UNIQUE(user_id, att_date)
);
CREATE TABLE IF NOT EXISTS holidays (
    att_date TEXT PRIMARY KEY, reason TEXT NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS user_strikes (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    strikes INTEGER NOT NULL DEFAULT 0, last_period TEXT NOT NULL DEFAULT '',
    is_frozen INTEGER NOT NULL DEFAULT 0, cleared_reason TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
    username TEXT NOT NULL, action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
    prev_hash TEXT NOT NULL DEFAULT '', row_hash TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at);
"""


def get_conn(db_path: Path | str) -> sqlite3.Connection:
    """Open SQLite with foreign keys and dictionary-like rows enabled."""
    if str(db_path) != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    if str(db_path) != ":memory:":
        # WAL mode avoids locking errors when Streamlit reads and writes
        conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path: Path | str) -> None:
    """Create all tables and indexes, and add is_okf on older databases."""
    conn = get_conn(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        cols = {row["name"] for row in conn.execute("PRAGMA table_info(documents)")}
        if "is_okf" not in cols:
            conn.execute("ALTER TABLE documents ADD COLUMN is_okf INTEGER NOT NULL DEFAULT 0")
        conn.commit()
    finally:
        conn.close()


def _run(db_path: Path | str, sql: str, params: tuple, mode: str):
    """Execute one SQL statement in a safely closed connection."""
    conn = get_conn(db_path)
    try:
        cur = conn.execute(sql, params)
        if mode == "all":
            return [dict(r) for r in cur.fetchall()]
        if mode == "one":
            row = cur.fetchone()
            return dict(row) if row else None
        conn.commit()
        return int(cur.lastrowid if mode == "insert" else cur.rowcount)
    finally:
        conn.close()


def fetch_all(db_path: Path | str, sql: str, params: tuple = ()) -> list[dict]:
    """Run a SELECT query and return rows as plain dictionaries."""
    return _run(db_path, sql, params, "all")


def fetch_one(db_path: Path | str, sql: str, params: tuple = ()) -> dict | None:
    """Run a SELECT query and return the first row or None."""
    return _run(db_path, sql, params, "one")


def insert_sql(db_path: Path | str, sql: str, params: tuple = ()) -> int:
    """Run an INSERT statement and return the new row ID."""
    return _run(db_path, sql, params, "insert")


def execute_sql(db_path: Path | str, sql: str, params: tuple = ()) -> int:
    """Run an UPDATE or DELETE statement and return affected row count."""
    return _run(db_path, sql, params, "exec")


def get_meta(db_path: Path | str, key: str, default: str = "") -> str:
    """Read a persisted setting from app_meta."""
    row = fetch_one(db_path, "SELECT value FROM app_meta WHERE key = ?", (key,))
    return row["value"] if row else default


def set_meta(db_path: Path | str, key: str, value: str) -> None:
    """Save or update a persisted setting in app_meta."""
    execute_sql(db_path, "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)", (key, value))
