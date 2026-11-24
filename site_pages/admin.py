from django.contrib import admin

from site_pages.models import EarlyAccessRequest


@admin.register(EarlyAccessRequest)
class EarlyAccessRequestAdmin(admin.ModelAdmin):
    list_display = ("name", "organisation", "email", "team_size", "plan", "created_at", "handled")
    list_filter = ("plan", "team_size", "handled")
    list_editable = ("handled",)
    search_fields = ("name", "email", "organisation")
    readonly_fields = ("created_at",)
