"""Persona resolution and the permission-first access rules for the demo workspace.

Headers only select a synthetic preview persona; they are not authentication.
The checks below demonstrate role- and scope-based access and must not be
treated as a security boundary for real documents.
"""

from dataclasses import dataclass

from django.db.models import Count
from django.utils.text import slugify

from .models import DemoPersona, Department, WorkspaceDocument


class UnknownPersona(Exception):
    pass


@dataclass(frozen=True)
class Actor:
    persona: DemoPersona

    @property
    def role(self):
        return self.persona.role

    @property
    def department(self):
        return self.persona.department

    @property
    def label(self):
        return self.persona.display_name

    def can(self, permission):
        return self.role.has_permission(permission)


def resolve_actor(request):
    """Return the persona named by X-Demo-User, defaulting to the seeded Admin."""
    raw = request.headers.get("X-Demo-User", "").strip() or "admin"
    if len(raw) > 80:
        raise UnknownPersona("Unknown demo persona.")
    persona = (
        DemoPersona.objects.select_related("role", "department")
        .filter(username=slugify(raw), is_active=True)
        .first()
    )
    if persona is None:
        raise UnknownPersona("Unknown demo persona.")
    return Actor(persona)


def department_children_map():
    children = {}
    for dept_id, parent_id in Department.objects.values_list("id", "parent_id"):
        children.setdefault(parent_id, []).append(dept_id)
    return children


def with_descendants(department_ids, children=None):
    children = children if children is not None else department_children_map()
    found = set(department_ids)
    pending = list(found)
    while pending:
        for child in children.get(pending.pop(), []):
            if child not in found:
                found.add(child)
                pending.append(child)
    return found


def subordinate_ids(persona):
    """Everyone who reports to ``persona`` directly or through other reports."""
    reports = {}
    for member_id, manager_id in DemoPersona.objects.exclude(reports_to=None).values_list("id", "reports_to_id"):
        reports.setdefault(manager_id, []).append(member_id)
    found, pending = set(), [persona.pk]
    while pending:
        for member_id in reports.get(pending.pop(), []):
            if member_id not in found and member_id != persona.pk:
                found.add(member_id)
                pending.append(member_id)
    return found


class AccessScope:
    """Everything needed to evaluate the access rules without per-row queries."""

    def __init__(self, actor):
        self.actor = actor
        persona = actor.persona
        self.persona_id = persona.pk
        self.role_id = persona.role_id
        self.department_id = persona.department_id
        self.view_all_documents = actor.can("documents.view_all")
        self.view_all_rooms = actor.can("rooms.view_all")
        self.managed_ids = with_descendants(
            persona.managed_departments.values_list("id", flat=True)
        )
        self.subordinates = subordinate_ids(persona)

    def can_access_document(self, document):
        """Owner, explicit grants and role policy; department membership never crosses departments."""
        if self.view_all_documents or document.owner_id == self.persona_id:
            return True
        if any(p.pk == self.persona_id for p in document.persona_grants.all()):
            return True
        if any(r.pk == self.role_id for r in document.role_grants.all()):
            return True
        if self.department_id and any(d.pk == self.department_id for d in document.department_grants.all()):
            return True
        if document.access_mode == WorkspaceDocument.AccessMode.SCOPE:
            return False
        if document.department_id is None:
            return True  # Company-wide under the role-based policy.
        if document.department_id == self.department_id:
            return True
        if document.department_id in self.managed_ids:
            return True
        return document.owner_id in self.subordinates

    def can_access_room(self, room):
        if self.view_all_rooms or room.is_general or room.scope == "workspace":
            return True
        if room.created_by_id == self.persona_id:
            return True
        if room.scope == "department":
            return room.department_id in ({self.department_id} | self.managed_ids)
        return any(m.pk == self.persona_id for m in room.members.all())


def document_queryset():
    return (
        WorkspaceDocument.objects.select_related("department", "owner")
        .prefetch_related("role_grants", "department_grants", "persona_grants")
        .annotate(chunk_count=Count("chunks"))
    )


def accessible_documents(actor, scope=None):
    scope = scope or AccessScope(actor)
    return [doc for doc in document_queryset() if scope.can_access_document(doc)]


def can_assign_permissions(actor, permissions):
    """Nobody can hand out permissions they do not hold themselves."""
    if actor.can("*"):
        return True
    held = set(actor.role.permissions or [])
    return "*" not in permissions and set(permissions) <= held
