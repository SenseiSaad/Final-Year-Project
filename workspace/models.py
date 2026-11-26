"""Persistent models for the public DocuTrust demo workspace.

There is intentionally no authenticated-user boundary: the ``X-Demo-User``
header selects a synthetic persona and is not a credential. Never put real or
confidential organisation data in this workspace.
"""

import hashlib
import json
import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def clean(self):
        super().clean()
        ancestor = self.parent
        while ancestor is not None:
            if self.pk and ancestor.pk == self.pk:
                raise ValidationError({"parent": "A department cannot be its own ancestor."})
            ancestor = ancestor.parent

    def __str__(self):
        return self.name


class WorkspaceRole(models.Model):
    """A role carrying an administrator-editable list of permission keys."""

    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=500, blank=True)
    permissions = models.JSONField(default=list, blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "code"]

    def has_permission(self, permission):
        perms = self.permissions or []
        return "*" in perms or permission in perms

    def __str__(self):
        return self.name


class DemoPersona(models.Model):
    """A selectable synthetic member; not a Django-authenticated account."""

    username = models.SlugField(max_length=80, unique=True)
    display_name = models.CharField(max_length=120)
    role = models.ForeignKey(WorkspaceRole, on_delete=models.PROTECT, related_name="personas")
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.PROTECT, related_name="personas"
    )
    reports_to = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="direct_reports"
    )
    # Explicit management scope: department membership alone never grants
    # access to other departments' content.
    managed_departments = models.ManyToManyField(
        Department, blank=True, related_name="managers"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_name", "username"]

    def clean(self):
        super().clean()
        seen = set()
        manager = self.reports_to
        while manager is not None:
            if self.pk and manager.pk == self.pk:
                raise ValidationError({"reports_to": "Reporting lines cannot form a loop."})
            if manager.pk in seen:
                break
            seen.add(manager.pk)
            manager = manager.reports_to

    def __str__(self):
        return f"{self.display_name} ({self.role.name})"


def workspace_document_path(instance, filename):
    # User-controlled filenames never reach storage paths.
    suffix = Path(filename).suffix.lower()
    return f"workspace/documents/{uuid.uuid4().hex}{suffix}"


class WorkspaceDocument(models.Model):
    class AccessMode(models.TextChoices):
        RBAC = "rbac", "Role-based policy"
        SCOPE = "scope", "Admin-defined scope"

    title = models.CharField(max_length=200)
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=workspace_document_path)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64)
    owner = models.ForeignKey(
        DemoPersona, null=True, blank=True, on_delete=models.SET_NULL, related_name="documents"
    )
    owner_label = models.CharField(max_length=120)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.PROTECT, related_name="documents"
    )
    access_mode = models.CharField(max_length=20, choices=AccessMode.choices, default=AccessMode.RBAC)
    role_grants = models.ManyToManyField(WorkspaceRole, blank=True, related_name="document_grants")
    department_grants = models.ManyToManyField(Department, blank=True, related_name="document_grants")
    persona_grants = models.ManyToManyField(DemoPersona, blank=True, related_name="document_grants")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    document = models.ForeignKey(WorkspaceDocument, on_delete=models.CASCADE, related_name="chunks")
    index = models.PositiveIntegerField()
    text = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["document_id", "index"]
        constraints = [
            models.UniqueConstraint(fields=["document", "index"], name="workspace_chunk_doc_index_uniq")
        ]


class AIThread(models.Model):
    owner = models.ForeignKey(DemoPersona, on_delete=models.CASCADE, related_name="ai_threads")
    title = models.CharField(max_length=200, default="New chat")
    provider = models.CharField(max_length=30, blank=True)
    model = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]


class AIMessage(models.Model):
    class Kind(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    class Status(models.TextChoices):
        ANSWERED = "answered", "Answered"
        REFUSED = "refused", "No permitted source"

    thread = models.ForeignKey(AIThread, on_delete=models.CASCADE, related_name="messages")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    content = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, blank=True)
    citations = models.JSONField(default=list, blank=True)
    provider = models.CharField(max_length=30, blank=True)
    model = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class TeamRoom(models.Model):
    class Scope(models.TextChoices):
        WORKSPACE = "workspace", "Everyone"
        DEPARTMENT = "department", "One department"
        MEMBERS = "members", "Selected members"

    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=300, blank=True)
    scope = models.CharField(max_length=12, choices=Scope.choices, default=Scope.WORKSPACE)
    department = models.ForeignKey(
        Department, null=True, blank=True, on_delete=models.PROTECT, related_name="team_rooms"
    )
    members = models.ManyToManyField(DemoPersona, blank=True, related_name="member_rooms")
    is_general = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        DemoPersona, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_rooms"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_general", "name"]

    def __str__(self):
        return self.name


class TeamMessage(models.Model):
    room = models.ForeignKey(TeamRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        DemoPersona, null=True, blank=True, on_delete=models.SET_NULL, related_name="team_messages"
    )
    sender_label = models.CharField(max_length=120)
    content = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


GENESIS_HASH = "0" * 64


def audit_digest(event):
    """SHA-256 over a canonical encoding of one entry, linked to its predecessor."""
    payload = {
        "sequence": event.sequence,
        "timestamp": event.timestamp.isoformat(),
        "actor_id": event.actor_id,
        "actor_label": event.actor_label,
        "actor_role": event.actor_role,
        "actor_department": event.actor_department,
        "event_type": event.event_type,
        "object_type": event.object_type,
        "object_id": event.object_id,
        "details": event.details,
        "previous_hash": event.previous_hash,
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class ImmutableAuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise TypeError("Audit events are immutable.")

    def delete(self):
        raise TypeError("Audit events are immutable.")

    def bulk_update(self, *args, **kwargs):
        raise TypeError("Audit events are immutable.")


class AuditEvent(models.Model):
    """Append-only audit record linked by a SHA-256 hash chain.

    The chain detects edits made after the fact. It is not anchored outside the
    database, so someone with full database access could still rewrite it.
    """

    sequence = models.PositiveBigIntegerField(unique=True)
    timestamp = models.DateTimeField(default=timezone.now, editable=False)
    actor = models.ForeignKey(
        DemoPersona, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_events"
    )
    actor_label = models.CharField(max_length=120)
    actor_role = models.CharField(max_length=80)
    actor_department = models.CharField(max_length=100, blank=True)
    event_type = models.CharField(max_length=100)
    object_type = models.CharField(max_length=80, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    previous_hash = models.CharField(max_length=64, default=GENESIS_HASH, editable=False)
    event_hash = models.CharField(max_length=64, editable=False)

    objects = ImmutableAuditQuerySet.as_manager()

    class Meta:
        ordering = ["sequence"]
        indexes = [models.Index(fields=["actor", "sequence"], name="workspace_audit_actor_seq_idx")]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise TypeError("Audit events are immutable.")
        # SQLite runs transactions in IMMEDIATE mode (see settings), so two
        # writers cannot be handed the same sequence number.
        with transaction.atomic():
            previous = type(self).objects.order_by("-sequence").first()
            self.sequence = (previous.sequence + 1) if previous else 1
            self.timestamp = timezone.now()
            self.previous_hash = previous.event_hash if previous else GENESIS_HASH
            self.event_hash = audit_digest(self)
            return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise TypeError("Audit events are immutable.")

    def __str__(self):
        return f"{self.sequence}: {self.event_type} ({self.event_hash[:12]})"
