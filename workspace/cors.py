"""Narrow API CORS handling for the separately hosted public frontend."""

from django.conf import settings
from django.http import HttpResponse
from django.utils.cache import patch_vary_headers

ALLOWED_HEADERS = "Content-Type, X-Demo-User"
ALLOWED_METHODS = ("GET", "POST", "PATCH", "DELETE", "OPTIONS")


class WorkspaceCorsMiddleware:
    """Reflect only exact, configured origins. Cookies and credentials are never allowed."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        is_api = request.path.startswith("/api/workspace/")
        allowed = bool(origin) and origin in settings.WORKSPACE_CORS_ALLOWED_ORIGINS
        if is_api and request.method == "OPTIONS":
            if origin and not allowed:
                return HttpResponse(status=403)
            requested = request.headers.get("Access-Control-Request-Method", "").upper()
            if requested and requested not in ALLOWED_METHODS:
                return HttpResponse(status=403)
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if is_api:
            patch_vary_headers(response, ["Origin"])
            if allowed:
                response["Access-Control-Allow-Origin"] = origin
                response["Access-Control-Allow-Methods"] = ", ".join(ALLOWED_METHODS)
                response["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
                response["Access-Control-Expose-Headers"] = "Content-Disposition"
                response["Access-Control-Max-Age"] = "600"
        return response
