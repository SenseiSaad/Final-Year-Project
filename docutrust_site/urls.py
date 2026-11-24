from django.contrib import admin
from django.urls import path

from site_pages import views

# The public website lives in web/ (Next.js). Django serves the admin and the backend API.
urlpatterns = [
    path("api/early-access/", views.early_access, name="early_access"),
    path("admin/", admin.site.urls),
]
