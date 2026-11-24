"""Documents page placeholder (implemented in Phase 2)."""

import streamlit as st
from core.config import load_config, load_texts

cfg = load_config()
texts = load_texts()
st.set_page_config(page_title=f"{texts['documents']['heading']} - {cfg['app']['app_name']}", layout="wide")
st.title(texts["documents"]["heading"])
st.info("Coming in Phase 2: document upload, chunking, embedding, and re-indexing.")
