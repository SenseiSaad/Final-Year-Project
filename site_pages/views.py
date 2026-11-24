"""Backend endpoints for the public Next.js site (web/). Django keeps the data and the admin."""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from site_pages.forms import EarlyAccessForm


@csrf_exempt  # Called server-to-server by the Next.js server action, never by a browser form
@require_POST
def early_access(request):
    """Validate and store one early-access request. Returns field errors as JSON."""
    try:
        payload = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "errors": {"__all__": ["Invalid request body."]}}, status=400)

    form = EarlyAccessForm(payload)
    if not form.is_valid():
        errors = {field: [e["message"] for e in items] for field, items in form.errors.get_json_data().items()}
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    if not form.cleaned_data.get("website"):  # Filled honeypot means a bot: report success, store nothing
        form.save()
    return JsonResponse({"ok": True})
