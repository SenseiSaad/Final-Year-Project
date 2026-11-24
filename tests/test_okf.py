"""System-level OKF and permission-first retrieval tests."""

import numpy as np
import pytest

from core.config import load_config
from core.db import init_db, insert_sql
from core.retrieve import format_context, retrieve_chunks, set_document_okf


def _seed_users(db_file):
    admin_id = insert_sql(
        db_file,
        "INSERT INTO users (username, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?)",
        ("admin", "h", "admin", "", "2026-11-23T00:00:00"),
    )
    hr_id = insert_sql(
        db_file,
        "INSERT INTO users (username, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?)",
        ("bilal", "h", "employee", "HR", "2026-11-23T00:00:00"),
    )
    fin_id = insert_sql(
        db_file,
        "INSERT INTO users (username, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?)",
        ("ayesha", "h", "employee", "Finance", "2026-11-23T00:00:00"),
    )
    return (
        {"id": admin_id, "role": "admin", "department": ""},
        {"id": hr_id, "role": "employee", "department": "HR"},
        {"id": fin_id, "role": "employee", "department": "Finance"},
    )


def _add_doc(db_file, owner_id, filename, visibility, department, text, vec, is_okf=0):
    doc_id = insert_sql(
        db_file,
        """INSERT INTO documents
           (filename, file_type, owner_id, department, visibility, status, is_okf, chunk_count, created_at)
           VALUES (?, 'md', ?, ?, ?, 'ready', ?, 1, '2026-11-23T00:00:00')""",
        (filename, owner_id, department, visibility, is_okf),
    )
    blob = np.asarray(vec, dtype=np.float32).tobytes()
    insert_sql(
        db_file,
        "INSERT INTO chunks (doc_id, chunk_index, content, embedding, token_count) VALUES (?, 1, ?, ?, 10)",
        (doc_id, text, blob),
    )
    return doc_id


def test_okf_pin_is_admin_only_and_enforces_cap(tmp_path):
    db_file = tmp_path / "okf.db"
    init_db(db_file)
    admin, hr, _ = _seed_users(db_file)
    d1 = _add_doc(db_file, admin["id"], "n1.md", "everyone", "", "note 1", [1, 0])
    d2 = _add_doc(db_file, admin["id"], "n2.md", "everyone", "", "note 2", [1, 0])

    with pytest.raises(PermissionError):
        set_document_okf(db_file, d1, True, hr["role"], max_okf_docs=1)

    set_document_okf(db_file, d1, True, admin["role"], max_okf_docs=1)
    with pytest.raises(ValueError):
        set_document_okf(db_file, d2, True, admin["role"], max_okf_docs=1)


def test_okf_boost_and_reserved_slot_with_refusal_guard(tmp_path):
    db_file = tmp_path / "okf_rank.db"
    init_db(db_file)
    admin, hr, _ = _seed_users(db_file)
    cfg = load_config()
    cfg["rag"]["top_k"] = 2

    # Two older leave docs with high relevance, plus one short OKF update note
    _add_doc(db_file, admin["id"], "leave-2025-a.pdf", "everyone", "", "annual leave days policy 15 days", [0.95, 0.1])
    _add_doc(db_file, admin["id"], "leave-2025-b.pdf", "everyone", "", "annual leave carry over policy", [0.92, 0.1])
    _add_doc(db_file, admin["id"], "2026-updates.md", "everyone", "", "jan 2026 update: 18 days", [0.30, 0.9], is_okf=1)

    q_vec = np.asarray([1.0, 0.0], dtype=np.float32)
    hits = retrieve_chunks(db_file, hr, "annual leave days", cfg, query_vec=q_vec)
    assert len(hits) == 2
    assert any(h["filename"] == "2026-updates.md" and h["is_okf"] == 1 for h in hits)
    assert "[OKF | 2026-updates.md]" in format_context(hits)

    # Unrelated question must still refuse even though an OKF doc exists
    empty = retrieve_chunks(db_file, hr, "quantum submarine recipe", cfg, query_vec=np.asarray([0.0, 0.0], dtype=np.float32))
    assert empty == []


def test_okf_still_respects_department_permissions(tmp_path):
    db_file = tmp_path / "okf_acl.db"
    init_db(db_file)
    admin, hr, fin = _seed_users(db_file)
    cfg = load_config()

    _add_doc(db_file, fin["id"], "finance-okf.md", "department", "Finance", "budget cap rule", [1.0, 0.0], is_okf=1)
    _add_doc(db_file, admin["id"], "general.md", "everyone", "", "budget overview", [0.8, 0.2], is_okf=0)

    q_vec = np.asarray([1.0, 0.0], dtype=np.float32)
    hr_hits = retrieve_chunks(db_file, hr, "budget rule", cfg, query_vec=q_vec)
    fin_hits = retrieve_chunks(db_file, fin, "budget rule", cfg, query_vec=q_vec)

    assert all(h["filename"] != "finance-okf.md" for h in hr_hits)
    assert fin_hits[0]["filename"] == "finance-okf.md"
