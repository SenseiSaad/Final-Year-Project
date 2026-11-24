"""Shared With Me page placeholder (implemented in Phase 4)."""

import streamlit as st
from core.config import load_config, load_texts

cfg = load_config()
texts = load_texts()
st.set_page_config(page_title=f"{texts['shared']['heading']} - {cfg['app']['app_name']}", layout="wide")
st.title(texts["shared"]["heading"])
st.info("Coming in Phase 4: view and manage documents shared directly with you.")
