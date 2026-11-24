from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class WorkspaceUserAdmin(UserAdmin):
    list_display = ("username", "role", "department", "is_active", "date_joined")
    fieldsets = UserAdmin.fieldsets + (("Workspace role", {"fields": ("role", "department")}),)
