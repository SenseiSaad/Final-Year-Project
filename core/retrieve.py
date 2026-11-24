"""Permission-filtered hybrid retrieval (BM25 + cosine) with system-level OKF support."""

from datetime import datetime, timezone
from pathlib import Path
import re

import numpy as np
from rank_bm25 import BM25Okapi

from core.db import execute_sql, fetch_all, fetch_one

_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list[str]:
    """Lowercase alphanumeric tokens for simple, predictable BM25 matching."""
    return _WORD_RE.findall((text or "").lower())


def _cosine(vec_a: np.ndarray, blob: bytes | None) -> float:
    """Compute cosine similarity against a stored float32 embedding blob."""
    if not blob or vec_a.size == 0:
        return 0.0
    vec_b = np.frombuffer(blob, dtype=np.float32)
    if vec_b.size != vec_a.size:
        return 0.0
    denom = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
    return max(0.0, float(np.dot(vec_a, vec_b) / denom)) if denom > 0 else 0.0


def set_document_okf(
    db_path: Path | str, doc_id: int, is_okf: bool, actor_role: str, max_okf_docs: int = 3
) -> None:
    """Pin or unpin an OKF document (admin only, capped to keep search focused)."""
    if actor_role != "admin":
        raise PermissionError("Only administrators can change OKF status.")
    if is_okf:
        row = fetch_one(db_path, "SELECT COUNT(*) AS cnt FROM documents WHERE is_okf = 1 AND id != ?", (doc_id,))
        if row and int(row["cnt"]) >= max_okf_docs:
            raise ValueError(f"OKF limit reached ({max_okf_docs} pinned documents). Unpin one first.")
    execute_sql(db_path, "UPDATE documents SET is_okf = ? WHERE id = ?", (1 if is_okf else 0, doc_id))


def fetch_permitted_chunks(
    db_path: Path | str, user_id: int, role: str, department: str, now_iso: str | None = None
) -> list[dict]:
    """Filter documents by user permissions in SQL before any ranking runs."""
    if role == "admin":
        sql = """
            SELECT c.id, c.doc_id, c.chunk_index, c.content, c.embedding,
                   d.filename, d.is_okf
            FROM chunks c JOIN documents d ON d.id = c.doc_id
            WHERE d.status = 'ready'
        """
        return fetch_all(db_path, sql)
    now = now_iso or datetime.now(timezone.utc).isoformat()
    sql = """
        SELECT c.id, c.doc_id, c.chunk_index, c.content, c.embedding,
               d.filename, d.is_okf
        FROM chunks c JOIN documents d ON d.id = c.doc_id
        WHERE d.status = 'ready' AND (
            d.visibility = 'everyone'
            OR d.owner_id = ?
            OR (d.visibility = 'department' AND d.department != '' AND d.department = ?)
            OR EXISTS (
                SELECT 1 FROM document_shares s
                WHERE s.doc_id = d.id AND s.shared_with_user_id = ?
                  AND (s.expires_at IS NULL OR s.expires_at > ?)
            )
        )
    """
    return fetch_all(db_path, sql, (user_id, department or "", user_id, now))


def _score_chunks(chunks: list[dict], question: str, query_vec: np.ndarray | None, rag_cfg: dict) -> list[dict]:
    """Score chunks with BM25 + cosine similarity; keep raw_score separate from OKF boost."""
    corpus = [_tokens(c["content"]) for c in chunks]
    q_toks = _tokens(question)
    bm25_raw = BM25Okapi(corpus).get_scores(q_toks) if q_toks and any(corpus) else np.zeros(len(chunks))
    max_bm25 = float(np.max(bm25_raw)) if len(bm25_raw) else 0.0
    w_kw, w_vec = float(rag_cfg["bm25_weight"]), float(rag_cfg["vector_weight"])
    okf_boost = float(rag_cfg.get("okf_boost", 0.15))

    scored = []
    for idx, chunk in enumerate(chunks):
        kw_norm = float(bm25_raw[idx] / max_bm25) if max_bm25 > 0 else 0.0
        has_vec = query_vec is not None and bool(chunk.get("embedding"))
        raw = (w_kw * kw_norm + w_vec * _cosine(query_vec, chunk["embedding"])) if has_vec else kw_norm
        final = raw + (okf_boost if chunk["is_okf"] else 0.0)
        scored.append({**chunk, "raw_score": raw, "score": final})
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored


def retrieve_chunks(
    db_path: Path | str,
    user: dict,
    question: str,
    cfg: dict,
    query_vec: np.ndarray | None = None,
    now_iso: str | None = None,
) -> list[dict]:
    """Return top_k permitted chunks with OKF tie-break boost and 1 reserved slot."""
    chunks = fetch_permitted_chunks(db_path, user["id"], user["role"], user.get("department", ""), now_iso)
    if not chunks:
        return []
    rag = cfg["rag"]
    scored = _score_chunks(chunks, question, query_vec, rag)
    # Check min_score against unboosted raw_score so OKF never forces an answer on unrelated questions
    if max(item["raw_score"] for item in scored) < float(rag["min_score"]):
        return []

    top_k = int(rag["top_k"])
    top = scored[:top_k]
    if rag.get("okf_reserve_slot", True) and top_k > 0 and not any(item["is_okf"] for item in top):
        best_okf = next((item for item in scored if item["is_okf"]), None)
        if best_okf is not None:
            top = top[: top_k - 1] + [best_okf]
    return top


def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks for prompts/answer.txt, tagging OKF passages clearly."""
    blocks = []
    for chunk in chunks:
        label = f"OKF | {chunk['filename']}" if chunk.get("is_okf") else chunk["filename"]
        safe_text = chunk["content"].replace("```", "'''").strip()
        blocks.append(f"[{label}]\n{safe_text}")
    return "\n\n".join(blocks)
