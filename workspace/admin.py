from django.contrib import admin

from .models import (
    AIMessage,
    AIThread,
    AuditEvent,
    DemoPersona,
    Department,
    DocumentChunk,
    TeamMessage,
    TeamRoom,
    WorkspaceDocument,
    WorkspaceRole,
)

admin.site.register([Department, WorkspaceRole, DemoPersona, TeamRoom])


@admin.register(WorkspaceDocument)
class WorkspaceDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "owner_label", "department", "access_mode", "created_at")
    readonly_fields = ("sha256", "size_bytes", "mime_type")


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """Read-only: the chain must only ever be extended by the application."""

    list_display = ("sequence", "timestamp", "actor_label", "event_type", "object_type", "object_id")
    list_filter = ("event_type",)
    search_fields = ("actor_label", "event_type")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in (AIThread, AIMessage, DocumentChunk, TeamMessage):
    admin.site.register(model)
