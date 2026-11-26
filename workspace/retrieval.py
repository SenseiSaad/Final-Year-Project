"""Text extraction, chunking and permission-first retrieval."""

import io
import math
import os
import re
from collections import Counter

from docx import Document as DocxDocument
from pypdf import PdfReader

from .models import DocumentChunk

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
MAX_PDF_PAGES = 400

UNSUPPORTED_MESSAGE = "Unsupported file type. Upload a PDF, DOCX, Markdown or TXT file."


def extract_text(filename, content):
    """Return [(page_number | None, text)] for a whitelisted file, rejecting malformed input."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(UNSUPPORTED_MESSAGE)
    if ext in {".txt", ".md"}:
        try:
            return [(None, content.decode("utf-8-sig"))]
        except UnicodeDecodeError as exc:
            raise ValueError("Text files must be UTF-8 encoded.") from exc
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                raise ValueError("Password-protected PDF files are not supported.")
            if len(reader.pages) > MAX_PDF_PAGES:
                raise ValueError(f"PDF files are limited to {MAX_PDF_PAGES} pages.")
            return [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("The PDF could not be read.") from exc
    try:
        document = DocxDocument(io.BytesIO(content))
        parts = [p.text for p in document.paragraphs if p.text.strip()]
        for table in document.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text.strip() for cell in row.cells if cell.text.strip()))
        return [(None, "\n".join(parts))]
    except Exception as exc:
        raise ValueError("The DOCX file could not be read.") from exc


def split_chunks(page_texts, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Overlapping chunks that keep the PDF page number they came from."""
    chunks, index = [], 0
    for page, text in page_texts:
        clean = re.sub(r"\s+", " ", text or "").strip()
        start = 0
        while clean and start < len(clean):
            end = min(start + size, len(clean))
            if end < len(clean):
                boundary = clean.rfind(" ", start + size // 2, end)
                if boundary > start:
                    end = boundary
            segment = clean[start:end].strip()
            if segment:
                chunks.append((index, segment, page))
                index += 1
            if end >= len(clean):
                break
            start = max(start + 1, end - overlap)
    return chunks


STOP_WORDS = set("""
a about after again all also am an and any are as at be been being but by can could did do does doing done
for from get gets give given had has have having he her here hers him his how i if in into is it its just
many may me more most much my no not of off on one only or other our out over please she should so some such
tell than that the their them then there these they this those to too under up us very was we were what when
where which while who whom why will with would you your yours explain say said show
""".split())

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _stem(token):
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("es") and token[-3] in "sxz":
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text):
    return [_stem(t) for t in _TOKEN_RE.findall((text or "").lower()) if t not in STOP_WORDS and len(t) > 1]


def rank_chunks(chunks, question, limit=5):
    """BM25 over already-permitted chunks. Returns [(score, chunk)] best first.

    A chunk must match at least two distinct query terms (or the only one) so a
    lone generic word cannot pull in an unrelated passage.
    """
    terms = set(tokenize(question))
    if not terms or not chunks:
        return []
    tokenised = [Counter(tokenize(chunk.text)) for chunk in chunks]
    doc_count = len(chunks)
    average = (sum(sum(c.values()) for c in tokenised) / doc_count) or 1
    frequency = {t: sum(1 for c in tokenised if t in c) for t in terms}
    needed = min(2, len(terms))
    scored = []
    for chunk, counts in zip(chunks, tokenised):
        matched = [t for t in terms if t in counts]
        if len(matched) < needed:
            continue
        length = sum(counts.values()) or 1
        score = 0.0
        for term in matched:
            idf = math.log(1 + (doc_count - frequency[term] + 0.5) / (frequency[term] + 0.5))
            tf = counts[term]
            score += idf * tf * 2.5 / (tf + 1.5 * (0.25 + 0.75 * length / average))
        scored.append((score, chunk))
    scored.sort(key=lambda item: (-item[0], item[1].document_id, item[1].index))
    if not scored:
        return []
    floor = scored[0][0] * 0.35
    return [item for item in scored[:limit] if item[0] >= floor]


def permitted_chunks(document_ids):
    return list(DocumentChunk.objects.filter(document_id__in=document_ids).select_related("document"))


def snippet(text, width=240):
    return text[:width].strip() + ("…" if len(text) > width else "")
