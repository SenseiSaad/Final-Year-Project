"""JSON API for the public demo workspace.

There is no real login. The ``X-Demo-User`` header selects a synthetic persona
and every handler resolves it and checks permissions server-side. That makes
the role model demonstrable, but it is not authentication: do not store real
or confidential documents here.
"""

import json
from functools import wraps

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.http import FileResponse, Http404, JsonResponse
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import providers, services
from .audit import append_audit, people_summary, verify_chain
from .models import (
    AIThread,
    Announcement,
    AuditEvent,
    DemoPersona,
    Department,
    Note,
    TeamMessage,
    TeamRoom,
    WorkspaceDocument,
    WorkspaceRole,
)
from .policies import (
    AccessScope,
    UnknownPersona,
    accessible_documents,
    can_assign_permissions,
    document_queryset,
    resolve_actor,
)
from .retrieval import ALLOWED_EXTENSIONS
from .seed import PERMISSIONS, PROTECTED_USERNAMES

MAX_JSON_BODY = 128 * 1024
DEMO_NOTICE = (
    "Public demo: this is not sign-in, and everyone enters as the Administrator. Use synthetic data only; "
    "do not upload real or confidential documents."
)


class ApiError(Exception):
    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.message, self.status, self.extra = message, status, extra


def api(*methods, perm=None):
    """Resolve the persona, enforce an optional permission, and map errors to JSON."""

    def decorator(view):
        @csrf_exempt
        @require_http_methods(list(methods))
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            try:
                try:
                    actor = resolve_actor(request)
                except UnknownPersona as exc:
                    raise ApiError(str(exc), 400) from None
                if perm and not actor.can(perm):
                    raise ApiError("This demo role is not allowed to do that.", 403)
                result = view(request, actor, *args, **kwargs)
            except ApiError as exc:
                return JsonResponse({"error": exc.message, **exc.extra}, status=exc.status)
            if isinstance(result, tuple):
                return JsonResponse(result[0], status=result[1])
            if isinstance(result, dict):
                return JsonResponse(result)
            return result

        return wrapper

    return decorator


def body(request):
    if request.content_type != "application/json":
        raise ApiError("Send a JSON request body.")
    if len(request.body) > MAX_JSON_BODY:
        raise ApiError("Request body is too large.", 413)
    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ApiError("Invalid JSON request body.") from None
    if not isinstance(payload, dict):
        raise ApiError("The JSON body must be an object.")
    return payload


def text_field(payload, key, label, *, max_length, required=True, default=""):
    value = payload.get(key, default)
    if value is None:
        value = default
    if not isinstance(value, str):
        raise ApiError(f"{label} must be text.")
    value = value.strip()
    if required and not value:
        raise ApiError(f"{label} is required.")
    if len(value) > max_length:
        raise ApiError(f"{label} must be at most {max_length} characters.")
    return value


def fetch(model, pk, label="Item", queryset=None):
    try:
        return (queryset if queryset is not None else model.objects).get(pk=int(pk))
    except (model.DoesNotExist, TypeError, ValueError):
        raise ApiError(f"{label} not found.", 404) from None


def department_or_none(value):
    if value in (None, "", "null"):
        return None
    return fetch(Department, value, "Department")


def ids_list(value, label):
    if not isinstance(value, list) or len(value) > 300 or not all(isinstance(i, int) and not isinstance(i, bool) for i in value):
        raise ApiError(f"{label} must be a list of ids.")
    return list(dict.fromkeys(value))


# ------------------------------------------------------------------ serializers

def department_json(dept):
    return {"id": dept.pk, "name": dept.name, "parent_id": dept.parent_id, "description": dept.description}


def role_json(role):
    return {
        "id": role.pk, "code": role.code, "name": role.name, "description": role.description,
        "permissions": role.permissions or [], "is_system": role.is_system,
    }


def member_json(member):
    return {
        "id": member.pk,
        "username": member.username,
        "display_name": member.display_name,
        "role": {"id": member.role.pk, "code": member.role.code, "name": member.role.name},
        "department": department_json(member.department) if member.department else None,
        "reports_to_id": member.reports_to_id,
        "managed_department_ids": [d.pk for d in member.managed_departments.all()],
        "is_active": member.is_active,
        "is_protected": member.username in PROTECTED_USERNAMES,
    }


def members_queryset():
    return DemoPersona.objects.select_related("role", "department").prefetch_related("managed_departments")


def access_summary(doc):
    if doc.access_mode == WorkspaceDocument.AccessMode.SCOPE:
        parts = [r.name for r in doc.role_grants.all()] + [d.name for d in doc.department_grants.all()] + [
            p.display_name for p in doc.persona_grants.all()
        ]
        return "Admin-defined: " + ", ".join(parts) if parts else "Only the owner"
    return f"{doc.department.name} department" if doc.department_id else "Company-wide"


def document_json(doc, actor):
    editable = actor.can("documents.manage") or doc.owner_id == actor.persona.pk
    data = {
        "id": doc.pk,
        "title": doc.title,
        "filename": doc.original_filename,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
        "sha256": doc.sha256,
        "owner": doc.owner_label,
        "department": department_json(doc.department) if doc.department else None,
        "access_mode": doc.access_mode,
        "access_summary": access_summary(doc),
        "chunk_count": doc.chunk_count,
        "created_at": doc.created_at.isoformat(),
        "can_edit": editable,
        "can_delete": editable,
    }
    if editable:
        data["grants"] = {
            "roles": [r.pk for r in doc.role_grants.all()],
            "departments": [d.pk for d in doc.department_grants.all()],
            "personas": [p.pk for p in doc.persona_grants.all()],
        }
    return data


def room_json(room, actor):
    return {
        "id": room.pk,
        "name": room.name,
        "description": room.description,
        "scope": room.scope,
        "department": department_json(room.department) if room.department else None,
        "is_general": room.is_general,
        "member_ids": [m.pk for m in room.members.all()],
        "created_by": room.created_by.display_name if room.created_by else "",
        "can_manage": not room.is_general and (actor.can("rooms.view_all") or room.created_by_id == actor.persona.pk),
    }


def room_message_json(message):
    return {
        "id": message.pk,
        "sender": message.sender_label,
        "sender_id": message.sender_id,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }


def audit_json(event):
    return {
        "sequence": event.sequence,
        "timestamp": event.timestamp.isoformat(),
        "actor_id": event.actor_id,
        "actor": event.actor_label,
        "role": event.actor_role,
        "department": event.actor_department,
        "event_type": event.event_type,
        "object_type": event.object_type,
        "object_id": event.object_id,
        "details": event.details,
        "previous_hash": event.previous_hash,
        "event_hash": event.event_hash,
    }


def capabilities(actor):
    return {
        "upload_scope": actor.can("documents.manage"),
        "create_rooms": actor.can("rooms.create"),
        "manage_departments": actor.can("departments.manage"),
        "manage_members": actor.can("members.manage"),
        "manage_roles": actor.can("roles.manage"),
        "view_audit": actor.can("audit.view"),
        "manage_announcements": actor.can("announcements.manage"),
    }


# ------------------------------------------------------------------ bootstrap

@api("GET")
def bootstrap(request, actor):
    return {
        "user": {
            "id": actor.persona.pk,
            "username": actor.persona.username,
            "display_name": actor.label,
            "role": {"code": actor.role.code, "name": actor.role.name, "permissions": actor.role.permissions or []},
            "department": department_json(actor.department) if actor.department else None,
        },
        "capabilities": capabilities(actor),
        "personas": [member_json(m) for m in members_queryset().filter(is_active=True)],
        "departments": [department_json(d) for d in Department.objects.all()],
        "roles": [role_json(r) for r in WorkspaceRole.objects.all()],
        "permission_catalog": [{"key": k, "label": label, "description": desc} for k, label, desc in PERMISSIONS],
        "models": providers.provider_catalog(),
        "limits": {
            "max_upload_bytes": services.max_upload_bytes(),
            "extensions": sorted(ALLOWED_EXTENSIONS),
        },
        "demo_notice": DEMO_NOTICE,
    }


# ------------------------------------------------------------------ documents

def parse_grants(raw):
    if not raw:
        payload = {}
    else:
        try:
            payload = json.loads(raw) if isinstance(raw, str) else raw
        except json.JSONDecodeError:
            raise ApiError("grants must be valid JSON.") from None
    if not isinstance(payload, dict):
        raise ApiError("grants must be an object.")
    roles = ids_list(payload.get("roles", []), "Role grants")
    departments = ids_list(payload.get("departments", []), "Department grants")
    personas = ids_list(payload.get("personas", []), "Person grants")
    found = {
        "roles": list(WorkspaceRole.objects.filter(pk__in=roles)),
        "departments": list(Department.objects.filter(pk__in=departments)),
        "personas": list(DemoPersona.objects.filter(pk__in=personas)),
    }
    if (len(found["roles"]), len(found["departments"]), len(found["personas"])) != (
        len(roles), len(departments), len(personas)
    ):
        raise ApiError("One or more grants refer to something that does not exist.")
    return found


def valid_mode(value):
    if value not in {v for v, _ in WorkspaceDocument.AccessMode.choices}:
        raise ApiError("access_mode must be 'rbac' or 'scope'.")
    return value


@api("GET", "POST")
def documents(request, actor):
    if request.method == "GET":
        query = request.GET.get("q", "").strip()
        if query:
            if len(query) > 300:
                raise ApiError("Search text is too long.")
            return {"query": query, "results": services.search_documents(actor, query)}
        docs = accessible_documents(actor)
        return {"documents": [document_json(d, actor) for d in docs]}

    upload = request.FILES.get("file")
    if not upload:
        raise ApiError("Choose a file to upload.")
    mode = valid_mode(request.POST.get("access_mode") or "rbac")
    if actor.can("documents.manage"):
        raw_department = request.POST.get("department_id")
        department = actor.department if raw_department is None else department_or_none(raw_department)
        grants = parse_grants(request.POST.get("grants"))
    else:
        department = actor.department
        raw_department = request.POST.get("department_id")
        if raw_department not in (None, "") and str(raw_department) != str(actor.persona.department_id):
            raise ApiError("You can only upload to your own department.", 403)
        if request.POST.get("grants") not in (None, "", "{}"):
            raise ApiError("Only administrators can define access scopes.", 403)
        grants = {"roles": [], "departments": [], "personas": []}
        if mode == "rbac" and department is None:
            raise ApiError("You have no department, so uploads can only be kept private to you.")
    try:
        document = services.store_document(
            actor=actor, uploaded_file=upload, title=request.POST.get("title", ""),
            department=department, access_mode=mode, grants=grants,
        )
    except ValueError as exc:
        raise ApiError(str(exc)) from None
    document = fetch(WorkspaceDocument, document.pk, queryset=document_queryset())
    return {"document": document_json(document, actor)}, 201


def visible_document(actor, document_id):
    document = fetch(WorkspaceDocument, document_id, "Document", document_queryset())
    if not AccessScope(actor).can_access_document(document):
        raise ApiError("Document not found.", 404)
    return document


@api("GET", "PATCH", "DELETE")
def document_detail(request, actor, document_id):
    document = visible_document(actor, document_id)
    if request.method == "GET":
        append_audit(actor, "document.view", "document", document.pk, {"title": document.title})
        return {
            "document": document_json(document, actor),
            "chunks": [{"id": c.pk, "index": c.index, "page": c.page_number, "text": c.text} for c in document.chunks.all()],
        }
    manage = actor.can("documents.manage")
    if not (manage or document.owner_id == actor.persona.pk):
        raise ApiError("Only the owner or an administrator can change this document.", 403)

    if request.method == "DELETE":
        services.delete_document(actor, document)
        return {"deleted": True}

    payload = body(request)
    changes = {}
    with transaction.atomic():
        if "title" in payload:
            document.title = text_field(payload, "title", "Title", max_length=200)
        if "access_mode" in payload:
            document.access_mode = valid_mode(payload["access_mode"])
        if "department_id" in payload:
            if not manage:
                raise ApiError("Only administrators can move a document between departments.", 403)
            document.department = department_or_none(payload["department_id"])
        grants = None
        if "grants" in payload:
            if not manage:
                raise ApiError("Only administrators can define access scopes.", 403)
            grants = parse_grants(payload["grants"])
        if not manage and document.access_mode == "rbac" and document.department_id is None:
            raise ApiError("This document has no department, so it can only be kept private.")
        before = access_summary(document)
        document.save()
        if grants is not None:
            document.role_grants.set(grants["roles"])
            document.department_grants.set(grants["departments"])
            document.persona_grants.set(grants["personas"])
        document = fetch(WorkspaceDocument, document.pk, queryset=document_queryset())
        after = access_summary(document)
        changes = {"title": document.title, "access_mode": document.access_mode, "access": after, "previous_access": before}
        append_audit(actor, "document.access.update", "document", document.pk, changes)
    return {"document": document_json(document, actor)}


@api("GET")
def document_file(request, actor, document_id):
    document = visible_document(actor, document_id)
    try:
        handle = document.file.open("rb")
    except OSError:
        raise Http404("Document file is unavailable.") from None
    append_audit(actor, "document.download", "document", document.pk, {"title": document.title})
    response = FileResponse(handle, as_attachment=True, filename=document.original_filename)
    response["X-Content-Type-Options"] = "nosniff"
    return response


# ------------------------------------------------------------------ models and chat

@api("GET")
def models_list(request, actor):
    return providers.provider_catalog()


def thread_json(thread):
    return {
        "id": thread.pk, "title": thread.title, "provider": thread.provider, "model": thread.model,
        "created_at": thread.created_at.isoformat(), "updated_at": thread.updated_at.isoformat(),
    }


def message_json(message):
    return {
        "id": message.pk, "role": message.kind, "content": message.content, "status": message.status,
        "citations": message.citations, "provider": message.provider, "model": message.model,
        "created_at": message.created_at.isoformat(),
    }


def own_thread(actor, thread_id):
    return fetch(AIThread, thread_id, "Chat", AIThread.objects.filter(owner=actor.persona))


def ask_in_thread(actor, thread, payload):
    question = text_field(payload, "question", "Question", max_length=4000)
    try:
        provider, model, _info = providers.resolve_selection(payload.get("provider"), payload.get("model"))
    except ValueError as exc:
        raise ApiError(str(exc)) from None
    try:
        user_message, reply = services.ask(actor, thread, question, provider, model)
    except providers.ProviderUnavailable as exc:
        raise ApiError(str(exc), 503, provider=provider) from None
    except providers.ProviderFailure as exc:
        raise ApiError(str(exc), 502, provider=provider) from None
    return {"thread": thread_json(thread), "messages": [message_json(user_message), message_json(reply)]}


@api("GET", "POST")
def chat_threads(request, actor):
    if request.method == "GET":
        return {"threads": [thread_json(t) for t in AIThread.objects.filter(owner=actor.persona)[:100]]}
    payload = body(request) if request.body and request.content_type == "application/json" else {}
    thread = AIThread.objects.create(owner=actor.persona)
    if "question" not in payload:
        append_audit(actor, "chat.thread.create", "chat", thread.pk)
        return {"thread": thread_json(thread)}, 201
    # Start a chat with its first question; a failed first question leaves no empty chat behind.
    try:
        result = ask_in_thread(actor, thread, payload)
    except ApiError:
        thread.delete()
        raise
    append_audit(actor, "chat.thread.create", "chat", thread.pk)
    return result, 201


@api("GET", "DELETE")
def chat_thread_detail(request, actor, thread_id):
    thread = own_thread(actor, thread_id)
    if request.method == "DELETE":
        append_audit(actor, "chat.thread.delete", "chat", thread.pk, {"title": thread.title})
        thread.delete()
        return {"deleted": True}
    return {"thread": thread_json(thread), "messages": [message_json(m) for m in thread.messages.all()]}


@api("POST")
def chat_messages(request, actor, thread_id):
    return ask_in_thread(actor, own_thread(actor, thread_id), body(request))


# ------------------------------------------------------------------ team rooms

def rooms_queryset():
    return TeamRoom.objects.select_related("department", "created_by").prefetch_related("members")


def visible_room(actor, room_id):
    room = fetch(TeamRoom, room_id, "Room", rooms_queryset())
    if not AccessScope(actor).can_access_room(room):
        raise ApiError("Room not found.", 404)
    return room


def apply_room_fields(payload, room, actor, *, creating):
    if creating or "name" in payload:
        room.name = text_field(payload, "name", "Room name", max_length=100)
    if "description" in payload:
        room.description = text_field(payload, "description", "Description", max_length=300, required=False)
    scope = payload.get("scope", room.scope if not creating else "workspace")
    if scope not in {v for v, _ in TeamRoom.Scope.choices}:
        raise ApiError("scope must be workspace, department or members.")
    room.scope = scope
    room.department = department_or_none(payload.get("department_id")) if "department_id" in payload or creating else room.department
    if scope == "department" and room.department is None:
        raise ApiError("Choose the department for a department room.")
    if scope != "department":
        room.department = None
    members = None
    if "member_ids" in payload:
        wanted = ids_list(payload["member_ids"], "Members")
        members = list(DemoPersona.objects.filter(pk__in=wanted, is_active=True))
        if len(members) != len(wanted):
            raise ApiError("One or more members do not exist.")
    if scope == "members" and creating and members is None:
        members = []
    return members


@api("GET", "POST")
def team_rooms(request, actor):
    if request.method == "GET":
        scope = AccessScope(actor)
        return {"rooms": [room_json(r, actor) for r in rooms_queryset() if scope.can_access_room(r)]}
    if not actor.can("rooms.create"):
        raise ApiError("This demo role is not allowed to create rooms.", 403)
    payload = body(request)
    room = TeamRoom(created_by=actor.persona)
    members = apply_room_fields(payload, room, actor, creating=True)
    try:
        with transaction.atomic():
            room.save()
            if room.scope == "members":
                room.members.set(set(m.pk for m in members or []) | {actor.persona.pk})
            append_audit(actor, "team.room.create", "team_room", room.pk, {"name": room.name, "scope": room.scope})
    except IntegrityError:
        raise ApiError("A room with that name already exists.", 409) from None
    return {"room": room_json(fetch(TeamRoom, room.pk, queryset=rooms_queryset()), actor)}, 201


@api("PATCH", "DELETE")
def team_room_detail(request, actor, room_id):
    room = visible_room(actor, room_id)
    if room.is_general or not (actor.can("rooms.view_all") or room.created_by_id == actor.persona.pk):
        raise ApiError("This room cannot be changed by this role.", 403)
    if request.method == "DELETE":
        append_audit(actor, "team.room.delete", "team_room", room.pk, {"name": room.name})
        room.delete()
        return {"deleted": True}
    payload = body(request)
    members = apply_room_fields(payload, room, actor, creating=False)
    try:
        with transaction.atomic():
            room.save()
            if room.scope == "members" and members is not None:
                keep = {room.created_by_id} - {None}
                room.members.set(set(m.pk for m in members) | keep)
            append_audit(actor, "team.room.update", "team_room", room.pk, {"name": room.name, "scope": room.scope})
    except IntegrityError:
        raise ApiError("A room with that name already exists.", 409) from None
    return {"room": room_json(fetch(TeamRoom, room.pk, queryset=rooms_queryset()), actor)}


@api("GET", "POST")
def team_messages(request, actor, room_id):
    room = visible_room(actor, room_id)
    if request.method == "GET":
        try:
            after = int(request.GET.get("after", "0"))
        except ValueError:
            raise ApiError("after must be a number.") from None
        rows = room.messages.filter(pk__gt=after).order_by("-id")[:200]
        return {"room": room_json(room, actor), "messages": [room_message_json(m) for m in reversed(list(rows))]}
    payload = body(request)
    content = text_field(payload, "content", "Message", max_length=4000)
    message = TeamMessage.objects.create(room=room, sender=actor.persona, sender_label=actor.label, content=content)
    append_audit(actor, "team.message.create", "team_room", room.pk, {"room": room.name, "length": len(content)})
    return {"message": room_message_json(message)}, 201


# ------------------------------------------------------------------ directory

@api("GET", "POST")
def departments(request, actor):
    if request.method == "GET":
        return {"departments": [department_json(d) for d in Department.objects.all()]}
    if not actor.can("departments.manage"):
        raise ApiError("This demo role is not allowed to manage departments.", 403)
    payload = body(request)
    department = Department(
        name=text_field(payload, "name", "Name", max_length=100),
        description=text_field(payload, "description", "Description", max_length=500, required=False),
        parent=department_or_none(payload.get("parent_id")),
    )
    try:
        department.full_clean()
        department.save()
    except ValidationError as exc:
        raise ApiError("; ".join(m for msgs in exc.message_dict.values() for m in msgs)) from None
    append_audit(actor, "department.create", "department", department.pk, {"name": department.name})
    return {"department": department_json(department)}, 201


@api("PATCH", "DELETE", perm="departments.manage")
def department_detail(request, actor, department_id):
    department = fetch(Department, department_id, "Department")
    if request.method == "DELETE":
        name = department.name
        try:
            department.delete()
        except ProtectedError:
            raise ApiError("This department still has members, documents, rooms or sub-departments.", 409) from None
        append_audit(actor, "department.delete", "department", department_id, {"name": name})
        return {"deleted": True}
    payload = body(request)
    if "name" in payload:
        department.name = text_field(payload, "name", "Name", max_length=100)
    if "description" in payload:
        department.description = text_field(payload, "description", "Description", max_length=500, required=False)
    if "parent_id" in payload:
        department.parent = department_or_none(payload["parent_id"])
    try:
        department.full_clean()
        department.save()
    except ValidationError as exc:
        raise ApiError("; ".join(m for msgs in exc.message_dict.values() for m in msgs)) from None
    append_audit(actor, "department.update", "department", department.pk, {"name": department.name})
    return {"department": department_json(department)}


def apply_member_fields(payload, member, actor, *, creating):
    if creating or "display_name" in payload:
        member.display_name = text_field(payload, "display_name", "Name", max_length=120)
    if creating:
        username = slugify(text_field(payload, "username", "Username", max_length=80, required=False) or member.display_name)[:80]
        if not username:
            raise ApiError("Username must contain letters or digits.")
        member.username = username
    if creating or "role" in payload:
        role = WorkspaceRole.objects.filter(code=payload.get("role")).first()
        if role is None:
            raise ApiError("Choose an existing role.")
        if (role.pk != member.role_id if member.pk else True) and not can_assign_permissions(actor, role.permissions):
            raise ApiError("You cannot assign a role with permissions you do not hold.", 403)
        if member.username == "admin" and role.code != "admin":
            raise ApiError("The built-in Admin member must keep the Admin role.", 409)
        member.role = role
    if "department_id" in payload or creating:
        member.department = department_or_none(payload.get("department_id"))
    if "reports_to_id" in payload:
        member.reports_to = None if payload["reports_to_id"] in (None, "") else fetch(DemoPersona, payload["reports_to_id"], "Manager")
    if "is_active" in payload:
        if not isinstance(payload["is_active"], bool):
            raise ApiError("is_active must be true or false.")
        if member.username == "admin" and not payload["is_active"]:
            raise ApiError("The built-in Admin member cannot be deactivated.", 409)
        member.is_active = payload["is_active"]
    try:
        member.full_clean(exclude=["username", "role", "department", "reports_to"])
    except ValidationError as exc:
        raise ApiError("; ".join(m for msgs in exc.message_dict.values() for m in msgs)) from None


@api("GET", "POST")
def members(request, actor):
    if request.method == "GET":
        return {"members": [member_json(m) for m in members_queryset()]}
    if not actor.can("members.manage"):
        raise ApiError("This demo role is not allowed to manage members.", 403)
    payload = body(request)
    member = DemoPersona()
    apply_member_fields(payload, member, actor, creating=True)
    managed = ids_list(payload.get("managed_department_ids", []), "Managed departments")
    try:
        with transaction.atomic():
            member.save()
            member.managed_departments.set(Department.objects.filter(pk__in=managed))
            append_audit(actor, "member.create", "member", member.pk, {"username": member.username, "role": member.role.code})
    except IntegrityError:
        raise ApiError("A member with that username already exists.", 409) from None
    return {"member": member_json(fetch(DemoPersona, member.pk, queryset=members_queryset()))}, 201


@api("PATCH", perm="members.manage")
def member_detail(request, actor, member_id):
    member = fetch(DemoPersona, member_id, "Member", members_queryset())
    payload = body(request)
    managed = None
    if "managed_department_ids" in payload:
        managed = ids_list(payload["managed_department_ids"], "Managed departments")
    with transaction.atomic():
        apply_member_fields(payload, member, actor, creating=False)
        member.save()
        if managed is not None:
            member.managed_departments.set(Department.objects.filter(pk__in=managed))
        append_audit(actor, "member.update", "member", member.pk, {
            "username": member.username, "role": member.role.code,
            "department": member.department.name if member.department else "",
            "active": member.is_active,
        })
    return {"member": member_json(fetch(DemoPersona, member.pk, queryset=members_queryset()))}


def parse_permissions(payload, actor):
    permissions = payload.get("permissions", [])
    known = {k for k, _l, _d in PERMISSIONS} | {"*"}
    if not isinstance(permissions, list) or not all(isinstance(p, str) and p in known for p in permissions):
        raise ApiError("permissions must be a list of known permission keys.")
    permissions = sorted(set(permissions))
    if not can_assign_permissions(actor, permissions):
        raise ApiError("You cannot grant permissions you do not hold.", 403)
    return permissions


@api("GET", "POST")
def roles(request, actor):
    if request.method == "GET":
        return {"roles": [role_json(r) for r in WorkspaceRole.objects.all()]}
    if not actor.can("roles.manage"):
        raise ApiError("This demo role is not allowed to manage roles.", 403)
    payload = body(request)
    name = text_field(payload, "name", "Name", max_length=80)
    code = slugify(text_field(payload, "code", "Code", max_length=40, required=False) or name)[:40]
    if not code:
        raise ApiError("Code must contain letters or digits.")
    try:
        role = WorkspaceRole.objects.create(
            code=code, name=name,
            description=text_field(payload, "description", "Description", max_length=500, required=False),
            permissions=parse_permissions(payload, actor),
        )
    except IntegrityError:
        raise ApiError("A role with that code already exists.", 409) from None
    append_audit(actor, "role.create", "role", role.pk, {"code": role.code, "permissions": role.permissions})
    return {"role": role_json(role)}, 201


@api("PATCH", "DELETE", perm="roles.manage")
def role_detail(request, actor, role_id):
    role = fetch(WorkspaceRole, role_id, "Role")
    if request.method == "DELETE":
        if role.is_system or role.personas.exists() or role.document_grants.exists():
            raise ApiError("Built-in roles and roles in use cannot be deleted.", 409)
        append_audit(actor, "role.delete", "role", role.pk, {"code": role.code})
        role.delete()
        return {"deleted": True}
    payload = body(request)
    if role.code == "admin":
        raise ApiError("The Admin role is fixed.", 409)
    if "name" in payload:
        role.name = text_field(payload, "name", "Name", max_length=80)
    if "description" in payload:
        role.description = text_field(payload, "description", "Description", max_length=500, required=False)
    if "permissions" in payload:
        role.permissions = parse_permissions(payload, actor)
    role.save()
    append_audit(actor, "role.update", "role", role.pk, {"code": role.code, "permissions": role.permissions})
    return {"role": role_json(role)}


# ------------------------------------------------------------------ audit

def page_params(request):
    try:
        limit = min(max(int(request.GET.get("limit", "100")), 1), 500)
        before = int(request.GET.get("before", "0"))
    except ValueError:
        raise ApiError("limit and before must be numbers.") from None
    return limit, before


def paged_events(queryset, limit, before):
    if before:
        queryset = queryset.filter(sequence__lt=before)
    rows = list(queryset.order_by("-sequence")[: limit + 1])
    more = len(rows) > limit
    rows = rows[:limit]
    return {
        "events": [audit_json(e) for e in rows],
        "next_before": rows[-1].sequence if more else None,
    }


@api("GET", perm="audit.view")
def audit_list(request, actor):
    limit, before = page_params(request)
    queryset = AuditEvent.objects.all()
    if request.GET.get("type"):
        queryset = queryset.filter(event_type__startswith=request.GET["type"][:60])
    result = paged_events(queryset, limit, before)
    result["total"] = AuditEvent.objects.count()
    return result


@api("GET", perm="audit.view")
def audit_summary(request, actor):
    totals, searches, uploads, shares = people_summary()
    people = []
    for member in members_queryset():
        row = totals.get(member.pk)
        people.append({
            **member_json(member),
            "events": row["total"] if row else 0,
            "last_active": row["last"].isoformat() if row else None,
            "searches": searches.get(member.pk, 0),
            "uploads": uploads.get(member.pk, 0),
            "shares": shares.get(member.pk, 0),
        })
    head = AuditEvent.objects.order_by("-sequence").first()
    return {
        "people": people,
        "total_events": AuditEvent.objects.count(),
        "head_hash": head.event_hash if head else None,
    }


@api("GET", perm="audit.view")
def audit_user_history(request, actor, member_id):
    member = fetch(DemoPersona, member_id, "Member", members_queryset())
    limit, before = page_params(request)
    result = paged_events(AuditEvent.objects.filter(actor=member), limit, before)
    result["total"] = AuditEvent.objects.filter(actor=member).count()
    result["user"] = member_json(member)
    if not before:
        append_audit(actor, "audit.history.view", "member", member.pk, {"viewed": member.display_name})
    return result


@api("GET", perm="audit.view")
def audit_verify(request, actor):
    valid, checked, first_invalid, head = verify_chain()
    append_audit(actor, "audit.verify", "audit", "chain", {"valid": valid, "events_checked": checked})
    return {"valid": valid, "events_checked": checked, "first_invalid_sequence": first_invalid, "head_hash": head}


# ------------------------------------------------------------------ notes

def note_json(note):
    return {
        "id": note.pk, "title": note.title, "body": note.body, "pinned": note.pinned,
        "created_at": note.created_at.isoformat(), "updated_at": note.updated_at.isoformat(),
    }


def apply_note_fields(payload, note):
    if "title" in payload:
        note.title = text_field(payload, "title", "Title", max_length=160, required=False)
    if "body" in payload:
        note.body = text_field(payload, "body", "Note", max_length=20000, required=False)
    if "pinned" in payload:
        if not isinstance(payload["pinned"], bool):
            raise ApiError("Pinned must be true or false.")
        note.pinned = payload["pinned"]


@api("GET", "POST")
def notes(request, actor):
    if request.method == "GET":
        return {"notes": [note_json(n) for n in Note.objects.filter(owner=actor.persona)[:500]]}
    if Note.objects.filter(owner=actor.persona).count() >= 500:
        raise ApiError("You have reached the limit of 500 notes. Delete one first.", 409)
    note = Note(owner=actor.persona)
    apply_note_fields(body(request), note)
    note.save()
    return {"note": note_json(note)}, 201


@api("PATCH", "DELETE")
def note_detail(request, actor, note_id):
    note = fetch(Note, note_id, "Note", Note.objects.filter(owner=actor.persona))
    if request.method == "DELETE":
        note.delete()
        return {"deleted": True}
    apply_note_fields(body(request), note)
    note.save()
    return {"note": note_json(note)}


# ------------------------------------------------------------------ announcements

def announcement_json(item):
    return {
        "id": item.pk, "title": item.title, "body": item.body, "level": item.level,
        "pinned": item.pinned, "author": item.author_label, "created_at": item.created_at.isoformat(),
    }


def apply_announcement_fields(payload, item, *, creating):
    if creating or "title" in payload:
        item.title = text_field(payload, "title", "Title", max_length=160)
    if "body" in payload:
        item.body = text_field(payload, "body", "Message", max_length=4000, required=False)
    if "level" in payload:
        if payload["level"] not in Announcement.Level.values:
            raise ApiError("Level must be info or important.")
        item.level = payload["level"]
    if "pinned" in payload:
        if not isinstance(payload["pinned"], bool):
            raise ApiError("Pinned must be true or false.")
        item.pinned = payload["pinned"]


@api("GET", "POST")
def announcements(request, actor):
    if request.method == "GET":
        return {"announcements": [announcement_json(a) for a in Announcement.objects.all()[:200]]}
    if not actor.can("announcements.manage"):
        raise ApiError("This demo role is not allowed to post announcements.", 403)
    item = Announcement(author=actor.persona, author_label=actor.label)
    apply_announcement_fields(body(request), item, creating=True)
    item.save()
    append_audit(actor, "announcement.create", "announcement", item.pk, {"title": item.title, "level": item.level})
    return {"announcement": announcement_json(item)}, 201


@api("PATCH", "DELETE", perm="announcements.manage")
def announcement_detail(request, actor, announcement_id):
    item = fetch(Announcement, announcement_id, "Announcement")
    if request.method == "DELETE":
        title = item.title
        item.delete()
        append_audit(actor, "announcement.delete", "announcement", announcement_id, {"title": title})
        return {"deleted": True}
    apply_announcement_fields(body(request), item, creating=False)
    item.save()
    append_audit(actor, "announcement.update", "announcement", item.pk, {"title": item.title})
    return {"announcement": announcement_json(item)}
