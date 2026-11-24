"""Audit Log page placeholder (implemented in Phase 1)."""

import streamlit as st
from core.config import load_config, load_texts

cfg = load_config()
texts = load_texts()
st.set_page_config(page_title=f"{texts['audit']['heading']} - {cfg['app']['app_name']}", layout="wide")
st.title(texts["audit"]["heading"])
st.info("Coming in Phase 1: append-only audit log filters, integrity verification, and CSV export.")
