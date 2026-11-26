from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from site_pages import views as site_views
from workspace import views as w

# The public website lives in web/ (Next.js). Django serves early-access, the admin
# and the demo workspace API. Uploaded files are only served through the API.
def root(request):
    return JsonResponse({"service": "DocuTrust API", "status": "ok", "workspace": "/api/workspace/bootstrap/", "admin": "/admin/"})


urlpatterns = [
    path("", root, name="root"),
    path("api/early-access/", site_views.early_access, name="early_access"),
    path("api/workspace/bootstrap/", w.bootstrap, name="workspace_bootstrap"),
    path("api/workspace/documents/", w.documents, name="workspace_documents"),
    path("api/workspace/documents/<int:document_id>/", w.document_detail, name="workspace_document_detail"),
    path("api/workspace/documents/<int:document_id>/file/", w.document_file, name="workspace_document_file"),
    path("api/workspace/models/", w.models_list, name="workspace_models"),
    path("api/workspace/chats/", w.chat_threads, name="workspace_chats"),
    path("api/workspace/chats/<int:thread_id>/", w.chat_thread_detail, name="workspace_chat_detail"),
    path("api/workspace/chats/<int:thread_id>/messages/", w.chat_messages, name="workspace_chat_messages"),
    path("api/workspace/rooms/", w.team_rooms, name="workspace_rooms"),
    path("api/workspace/rooms/<int:room_id>/", w.team_room_detail, name="workspace_room_detail"),
    path("api/workspace/rooms/<int:room_id>/messages/", w.team_messages, name="workspace_room_messages"),
    path("api/workspace/departments/", w.departments, name="workspace_departments"),
    path("api/workspace/departments/<int:department_id>/", w.department_detail, name="workspace_department_detail"),
    path("api/workspace/members/", w.members, name="workspace_members"),
    path("api/workspace/members/<int:member_id>/", w.member_detail, name="workspace_member_detail"),
    path("api/workspace/roles/", w.roles, name="workspace_roles"),
    path("api/workspace/roles/<int:role_id>/", w.role_detail, name="workspace_role_detail"),
    path("api/workspace/notes/", w.notes, name="workspace_notes"),
    path("api/workspace/notes/<int:note_id>/", w.note_detail, name="workspace_note_detail"),
    path("api/workspace/announcements/", w.announcements, name="workspace_announcements"),
    path("api/workspace/announcements/<int:announcement_id>/", w.announcement_detail, name="workspace_announcement_detail"),
    path("api/workspace/audit/", w.audit_list, name="workspace_audit"),
    path("api/workspace/audit/summary/", w.audit_summary, name="workspace_audit_summary"),
    path("api/workspace/audit/users/<int:member_id>/", w.audit_user_history, name="workspace_audit_user"),
    path("api/workspace/audit/verify/", w.audit_verify, name="workspace_audit_verify"),
    path("admin/", admin.site.urls),
]
