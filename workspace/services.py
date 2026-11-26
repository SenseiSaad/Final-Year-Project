"""Workspace use-cases: uploads, document search and grounded chat."""

import hashlib
import os

from django.core.files.base import ContentFile
from django.db import transaction

from . import providers
from .audit import append_audit
from .models import AIMessage, DocumentChunk, WorkspaceDocument
from .policies import AccessScope, accessible_documents
from .retrieval import (
    ALLOWED_EXTENSIONS,
    MIME_BY_EXTENSION,
    UNSUPPORTED_MESSAGE,
    extract_text,
    permitted_chunks,
    rank_chunks,
    snippet,
    split_chunks,
)

DEFAULT_MAX_DOCUMENTS = 500


def _configured_upload_bytes():
    """The same per-file limit the landing page quotes (config.toml, uploads.max_file_mb)."""
    try:
        from core.config import load_config

        return int(float(load_config()["uploads"]["max_file_mb"]) * 1024 * 1024)
    except Exception:
        return 10 * 1024 * 1024


def _env_int(name, default):
    try:
        return max(1, int(os.environ.get(name, default)))
    except (TypeError, ValueError):
        return default


def max_upload_bytes():
    return _env_int("DOCUTRUST_MAX_UPLOAD_BYTES", _configured_upload_bytes())


def max_documents():
    return _env_int("DOCUTRUST_MAX_DOCUMENTS", DEFAULT_MAX_DOCUMENTS)


def _size_message(limit):
    return f"The file is larger than the {limit / (1024 * 1024):g} MB limit."


def store_document(*, actor, uploaded_file, title, department, access_mode, grants):
    """Validate and extract first; persist the file, chunks and audit event together."""
    filename = os.path.basename(uploaded_file.name or "upload")[:255]
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(UNSUPPORTED_MESSAGE)
    if WorkspaceDocument.objects.count() >= max_documents():
        raise ValueError("This demo workspace has reached its document limit. Delete a document first.")
    limit = max_upload_bytes()
    if uploaded_file.size > limit:
        raise ValueError(_size_message(limit))
    content = uploaded_file.read(limit + 1)
    if len(content) > limit:
        raise ValueError(_size_message(limit))
    chunks = split_chunks(extract_text(filename, content))
    if not chunks:
        raise ValueError("No readable text was found in this file. Scanned PDFs need a text layer.")

    document = WorkspaceDocument(
        title=(title or "").strip()[:200] or os.path.splitext(filename)[0][:200] or "Untitled",
        original_filename=filename,
        mime_type=MIME_BY_EXTENSION[ext],
        size_bytes=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        owner=actor.persona,
        owner_label=actor.label,
        department=department,
        access_mode=access_mode,
    )
    stored_name = None
    try:
        with transaction.atomic():
            document.file.save(filename, ContentFile(content), save=False)
            stored_name = document.file.name
            document.save()
            DocumentChunk.objects.bulk_create(
                DocumentChunk(document=document, index=i, text=text, page_number=page)
                for i, text, page in chunks
            )
            document.role_grants.set(grants["roles"])
            document.department_grants.set(grants["departments"])
            document.persona_grants.set(grants["personas"])
            append_audit(actor, "document.upload", "document", document.pk, {
                "title": document.title,
                "filename": filename,
                "size_bytes": document.size_bytes,
                "sha256": document.sha256,
                "chunks": len(chunks),
                "department": department.name if department else "Company-wide",
                "access_mode": access_mode,
            })
    except Exception:
        if stored_name:
            document.file.storage.delete(stored_name)
        raise
    return document


def delete_document(actor, document):
    details = {"title": document.title, "filename": document.original_filename}
    storage, name = document.file.storage, document.file.name
    with transaction.atomic():
        pk = document.pk
        document.delete()
        append_audit(actor, "document.delete", "document", pk, details)
    if name:
        storage.delete(name)


def search_documents(actor, query, limit=10):
    """Content search across documents the actor may open."""
    docs = {d.pk: d for d in accessible_documents(actor)}
    ranked = rank_chunks(permitted_chunks(list(docs)), query, limit=limit * 3)
    results, seen = [], set()
    for score, chunk in ranked:
        if chunk.document_id in seen:
            continue
        seen.add(chunk.document_id)
        results.append({
            "document_id": chunk.document_id,
            "title": chunk.document.title,
            "page": chunk.page_number,
            "snippet": snippet(chunk.text),
            "score": round(score, 3),
        })
        if len(results) >= limit:
            break
    append_audit(actor, "document.search", "search", "", {
        "query": query[:500],
        "results": [r["title"] for r in results],
    })
    return results


def is_refusal(text):
    return text.lower().lstrip().startswith("i could not find that answer")


def citation(index, chunk):
    return {
        "source": index,
        "document_id": chunk.document_id,
        "title": chunk.document.title,
        "page": chunk.page_number,
        "snippet": snippet(chunk.text),
    }


def ask(actor, thread, question, provider, model):
    """Retrieve from permitted documents, answer with the chosen provider, persist and audit."""
    docs = accessible_documents(actor)
    ranked = rank_chunks(permitted_chunks([d.pk for d in docs]), question)
    sources = [chunk for _score, chunk in ranked]
    audit = {
        "question": question,
        "provider": provider,
        "model": model,
        "sources": [{"document_id": c.document_id, "title": c.document.title} for c in sources],
    }

    answer, citations, status = providers.REFUSAL_MESSAGE, [], AIMessage.Status.REFUSED
    if sources:
        try:
            text = providers.generate_answer(provider, model, question, sources)
        except providers.ProviderUnavailable:
            append_audit(actor, "chat.question", "chat", thread.pk, {**audit, "outcome": "provider_unavailable"})
            raise
        except providers.ProviderFailure:
            append_audit(actor, "chat.question", "chat", thread.pk, {**audit, "outcome": "provider_error"})
            raise
        if not is_refusal(text):
            answer, status = text, AIMessage.Status.ANSWERED
            citations = [citation(i, chunk) for i, chunk in enumerate(sources, start=1)]

    with transaction.atomic():
        first = not thread.messages.exists()
        user_message = AIMessage.objects.create(thread=thread, kind=AIMessage.Kind.USER, content=question)
        reply = AIMessage.objects.create(
            thread=thread, kind=AIMessage.Kind.ASSISTANT, content=answer, status=status,
            citations=citations, provider=provider, model=model,
        )
        thread.provider, thread.model = provider, model
        if first:
            thread.title = " ".join(question.split())[:80]
        thread.save()
        append_audit(actor, "chat.question", "chat", thread.pk, {
            **audit, "outcome": status.value, "cited": [c["title"] for c in citations],
        })
    return user_message, reply
