"""Ask page placeholder (implemented in Phase 3)."""

import streamlit as st
from core.config import load_config, load_texts

cfg = load_config()
texts = load_texts()
st.set_page_config(page_title=f"{texts['ask']['heading']} - {cfg['app']['app_name']}", layout="wide")
st.title(texts["ask"]["heading"])
st.info("Coming in Phase 3: streaming Q&A with permission-filtered citations and ratings.")
