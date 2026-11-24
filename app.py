"""DocuTrust AI main entry page (Phase 0 skeleton: welcome UI and live status)."""

import streamlit as st

from core.config import load_config, load_texts, resolve_db_path
from core.db import fetch_one, init_db


def _count_rows(db_path, table: str) -> int:
    """Count rows in an allow-listed table to display real database numbers."""
    if table not in {"users", "documents", "audit_log"}:
        raise ValueError(f"Unexpected table name: {table}")
    row = fetch_one(db_path, f"SELECT COUNT(*) AS total FROM {table}")
    return int(row["total"]) if row else 0


def render_sidebar(cfg: dict, db_path) -> None:
    """Show app name, active models, and database status in the sidebar."""
    st.sidebar.title(cfg["app"]["app_name"])
    st.sidebar.caption(cfg["app"]["tagline"])
    st.sidebar.divider()
    st.sidebar.write(f"Chat model: `{cfg['models']['chat_model']}`")
    st.sidebar.write(f"Embed model: `{cfg['models']['embed_model']}`")
    st.sidebar.write(f"Database: `{db_path.name}`")


def _render_preview_box(w: dict, db_path) -> None:
    """Render the live sample document card with real SQLite counters."""
    with st.container(border=True):
        st.caption(w["preview_title"])
        st.write(f"**{w['preview_doc_title']}**")
        st.write(w["preview_doc_body"])
        m1, m2, m3 = st.columns(3)
        m1.metric("Users", _count_rows(db_path, "users"))
        m2.metric("Documents", _count_rows(db_path, "documents"))
        m3.metric("Audit Events", _count_rows(db_path, "audit_log"))


def _render_feature_grid(w: dict) -> None:
    """Render the 2x2 capability grid using plain Streamlit containers."""
    st.subheader(w["cards_heading"])
    pairs = [(("1", "2")), (("3", "4"))]
    for left_idx, right_idx in pairs:
        left_col, right_col = st.columns(2)
        for col, idx in ((left_col, left_idx), (right_col, right_idx)):
            with col:
                with st.container(border=True):
                    st.write(f"**{w[f'card_{idx}_title']}**")
                    st.caption(w[f"card_{idx}_desc"])


def _render_role_cards(w: dict) -> None:
    """Render the 3 workspace role cards (Employee, Department, Admin)."""
    st.subheader(w["roles_heading"])
    cols = st.columns(3)
    for col, idx in zip(cols, ("1", "2", "3")):
        with col:
            with st.container(border=True):
                st.write(f"**{w[f'role_{idx}_title']}**")
                st.caption(w[f"role_{idx}_desc"])


def main() -> None:
    """Initialize config and SQLite database, then render the entry page."""
    cfg = load_config()
    texts = load_texts()
    db_path = resolve_db_path(cfg)
    init_db(db_path)

    st.set_page_config(page_title=cfg["app"]["app_name"], layout="wide")
    render_sidebar(cfg, db_path)

    w = texts["welcome"]
    st.caption(texts["common"]["welcome_badge"])
    st.title(cfg["app"]["app_name"])
    st.subheader(w["hero_title"])
    st.write(w["hero_subtitle"])

    _render_preview_box(w, db_path)
    _render_feature_grid(w)
    _render_role_cards(w)

    st.info("Phase 0 skeleton active. Login and role dashboard will be enabled in Phase 1.")
    st.divider()
    st.caption(texts["common"]["footer_note"])


if __name__ == "__main__":
    main()
