"""Append-only audit trail helpers."""

from django.db.models import Count, Max

from .models import GENESIS_HASH, AuditEvent, audit_digest


def append_audit(actor, event_type, object_type="", object_id="", details=None):
    """Record one event with a snapshot of who did it. ``actor`` may be None for system events."""
    persona = actor.persona if actor else None
    return AuditEvent.objects.create(
        actor=persona,
        actor_label=persona.display_name if persona else "System",
        actor_role=persona.role.name if persona else "System",
        actor_department=persona.department.name if persona and persona.department else "",
        event_type=event_type,
        object_type=object_type,
        object_id="" if object_id is None else str(object_id),
        details=details or {},
    )


def verify_chain():
    """Recompute every hash. Returns (valid, checked, first_invalid_sequence, head_hash)."""
    previous_hash, checked = GENESIS_HASH, 0
    for expected, event in enumerate(AuditEvent.objects.order_by("sequence").iterator(), start=1):
        if (
            event.sequence != expected
            or event.previous_hash != previous_hash
            or event.event_hash != audit_digest(event)
        ):
            return False, checked, event.sequence, previous_hash
        previous_hash = event.event_hash
        checked += 1
    return True, checked, None, previous_hash


SEARCH_TYPES = ("chat.question", "document.search")
UPLOAD_TYPES = ("document.upload",)
SHARE_TYPES = ("document.access.update",)


def people_summary():
    """Per-person activity counts used by the audit overview."""
    rows = {
        row["actor"]: row
        for row in AuditEvent.objects.exclude(actor=None)
        .values("actor")
        .annotate(total=Count("id"), last=Max("timestamp"))
    }

    def counts(types):
        return {
            row["actor"]: row["n"]
            for row in AuditEvent.objects.filter(event_type__in=types, actor__isnull=False)
            .values("actor")
            .annotate(n=Count("id"))
        }

    searches, uploads, shares = counts(SEARCH_TYPES), counts(UPLOAD_TYPES), counts(SHARE_TYPES)
    return rows, searches, uploads, shares
