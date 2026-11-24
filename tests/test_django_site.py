"""Django backend tests: the early-access API and the workspace user model."""

import json
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "docutrust_site.settings")
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.test import SimpleTestCase, TestCase  # noqa: E402

from site_pages.models import EarlyAccessRequest  # noqa: E402


class EarlyAccessApiTests(TestCase):
    """The Next.js site posts early-access requests here; the public pages themselves live in web/."""

    valid = {"name": "Ayesha Khan", "email": "ayesha@example.com", "organisation": "Example Ltd",
             "team_size": "11-50", "plan": "pilot", "note": ""}

    def post(self, data):
        return self.client.post("/api/early-access/", json.dumps(data), content_type="application/json")

    def test_valid_request_is_stored(self):
        response = self.post(self.valid)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(EarlyAccessRequest.objects.count(), 1)

    def test_invalid_email_returns_field_error(self):
        response = self.post({**self.valid, "email": "not-an-email"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json()["errors"])
        self.assertEqual(EarlyAccessRequest.objects.count(), 0)

    def test_honeypot_is_accepted_but_not_stored(self):
        response = self.post({**self.valid, "website": "spam.example"})
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(EarlyAccessRequest.objects.count(), 0)

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client.get("/api/early-access/").status_code, 405)


class UserModelConfigTests(SimpleTestCase):
    def test_custom_user_model_is_active(self):
        from accounts.models import User

        self.assertIs(get_user_model(), User)

    def test_role_choices_carry_workspace_roles(self):
        from accounts.models import User

        roles = {choice for choice, _ in User.Roles.choices}
        self.assertEqual(roles, {"employee", "department", "admin"})
