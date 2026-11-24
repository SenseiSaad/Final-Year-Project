"""Attendance page placeholder (implemented in Phase 5)."""

import streamlit as st
from core.config import load_config, load_texts

cfg = load_config()
texts = load_texts()
st.set_page_config(page_title=f"{texts['attendance']['heading']} - {cfg['app']['app_name']}", layout="wide")
st.title(texts["attendance"]["heading"])
st.info("Coming in Phase 5: daily HMAC code check-in, QR display, and monthly attendance.")
