"""Backend tests for the persistent demo workspace.

The ``X-Demo-User`` header selects a synthetic persona; it is not authentication.
These tests cover the role/scope rules, audit chain and provider adapters only.
"""

import io
import json
import os
import tempfile
import urllib.error
from unittest.mock import MagicMock, patch

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "docutrust_site.settings")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.test import TestCase, override_settings  # noqa: E402
from docx import Document as DocxDocument  # noqa: E402

from workspace import providers  # noqa: E402
from workspace.models import (  # noqa: E402
    AIMessage,
    AuditEvent,
    DemoPersona,
    Department,
    DocumentChunk,
    TeamRoom,
    WorkspaceDocument,
    WorkspaceRole,
)
from workspace.audit import append_audit  # noqa: E402
from workspace.retrieval import extract_text, rank_chunks, split_chunks  # noqa: E402


def minimal_pdf(text):
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + obj + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % off for off in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF" % (len(objects) + 1, xref)
    return out


class WorkspaceTestCase(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        override = override_settings(MEDIA_ROOT=self.media.name)
        override.enable()
        self.addCleanup(override.disable)
        providers.clear_provider_cache()
        self.operations = Department.objects.get(name="Operations")
        self.finance_dept = Department.objects.get(name="Finance")
        self.hr_dept = Department.objects.get(name="Human Resources")
        self.persona = {p.username: p for p in DemoPersona.objects.all()}

    def call(self, method, path, as_user="admin", data=None, **extra):
        headers = {"HTTP_X_DEMO_USER": as_user} if as_user else {}
        kwargs = dict(headers, **extra)
        if data is None and method in {"post", "patch"}:
            data = {}
        if data is not None:
            kwargs.update(data=json.dumps(data), content_type="application/json")
        return getattr(self.client, method)(path, **kwargs)

    def upload(self, as_user="admin", name="policy.txt", text="Leave policy: staff receive thirty days of paid leave.",
               **fields):
        file = SimpleUploadedFile(name, text.encode() if isinstance(text, str) else text)
        return self.client.post(
            "/api/workspace/documents/", {"file": file, **fields}, HTTP_X_DEMO_USER=as_user,
        )

    def doc_ids(self, as_user):
        response = self.call("get", "/api/workspace/documents/", as_user)
        self.assertEqual(response.status_code, 200, response.content)
        return {d["id"] for d in response.json()["documents"]}

    def ask(self, as_user, question, provider="local", thread_id=None):
        if thread_id is None:
            thread_id = self.call("post", "/api/workspace/chats/", as_user).json()["thread"]["id"]
        return self.call("post", f"/api/workspace/chats/{thread_id}/messages/", as_user,
                         {"question": question, "provider": provider})


class SeedAndMigrationTests(WorkspaceTestCase):
    def test_migrations_are_complete_and_seed_data_exists(self):
        call_command("makemigrations", "--check", "--dry-run", verbosity=0)
        self.assertEqual(set(self.persona), {"admin", "ceo", "manager", "finance", "hr", "employee"})
        self.assertEqual(list(TeamRoom.objects.values_list("name", flat=True)), ["General"])
        self.assertEqual(Department.objects.count(), 3)
        manager = self.persona["manager"]
        self.assertEqual([d.name for d in manager.managed_departments.all()], ["Operations"])
        self.assertEqual(self.persona["employee"].reports_to, manager)

    def test_seed_command_is_idempotent_and_keeps_edits(self):
        DemoPersona.objects.filter(username="employee").update(display_name="Renamed")
        call_command("seed_workspace", stdout=io.StringIO())
        self.assertEqual(DemoPersona.objects.count(), 6)
        self.assertEqual(DemoPersona.objects.get(username="employee").display_name, "Renamed")

    def test_bootstrap_defaults_to_admin_and_rejects_unknown_persona(self):
        data = self.call("get", "/api/workspace/bootstrap/", None).json()
        self.assertEqual(data["user"]["role"]["code"], "admin")
        self.assertTrue(data["capabilities"]["view_audit"])
        self.assertIn("not sign-in", data["demo_notice"])
        self.assertEqual(self.call("get", "/api/workspace/bootstrap/", "nobody").status_code, 400)
        employee = self.call("get", "/api/workspace/bootstrap/", "employee").json()
        self.assertFalse(employee["capabilities"]["view_audit"])


class DocumentAccessTests(WorkspaceTestCase):
    def test_upload_persists_file_chunks_and_extracts_every_format(self):
        response = self.upload(department_id=self.operations.pk)
        self.assertEqual(response.status_code, 201, response.content)
        document = WorkspaceDocument.objects.get()
        self.assertTrue(os.path.isfile(document.file.path))
        self.assertEqual(document.chunks.count(), 1)
        self.assertEqual(response.json()["document"]["access_summary"], "Operations department")

        docx = DocxDocument()
        docx.add_paragraph("Expense claims need a receipt.")
        buffer = io.BytesIO()
        docx.save(buffer)
        self.assertIn("Expense claims", extract_text("a.docx", buffer.getvalue())[0][1])
        self.assertEqual(extract_text("a.pdf", minimal_pdf("Quarterly budget review"))[0], (1, "Quarterly budget review"))
        self.assertIn("# Title", extract_text("a.md", b"# Title")[0][1])
        self.assertEqual(self.upload(name="budget.pdf", text=minimal_pdf("Quarterly budget review")).status_code, 201)
        self.assertEqual(DocumentChunk.objects.filter(page_number=1).count(), 1)

    def test_upload_validation(self):
        self.assertEqual(self.upload(name="run.exe", text="x").status_code, 400)
        self.assertEqual(self.upload(name="empty.txt", text="   ").status_code, 400)
        self.assertEqual(self.upload(name="bad.docx", text="not a docx").status_code, 400)
        self.assertEqual(self.upload(name="bad.pdf", text="not a pdf").status_code, 400)
        with patch.dict(os.environ, {"DOCUTRUST_MAX_UPLOAD_BYTES": "5"}):
            self.assertEqual(self.upload(name="big.txt", text="123456").status_code, 400)
        with patch.dict(os.environ, {"DOCUTRUST_MAX_DOCUMENTS": "1"}):
            self.assertEqual(self.upload(name="one.txt").status_code, 201)
            self.assertEqual(self.upload(name="two.txt").status_code, 400)
        self.assertEqual(WorkspaceDocument.objects.count(), 1)

    def test_finance_and_hr_are_isolated_from_each_other(self):
        fin = self.upload(department_id=self.finance_dept.pk, text="Finance budget forecast figures.").json()["document"]["id"]
        hr = self.upload(department_id=self.hr_dept.pk, text="HR salary review notes.").json()["document"]["id"]
        company = self.upload(text="Company holiday calendar dates.", department_id="").json()["document"]["id"]
        self.assertEqual(self.doc_ids("finance"), {fin, company})
        self.assertEqual(self.doc_ids("hr"), {hr, company})
        self.assertEqual(self.call("get", f"/api/workspace/documents/{hr}/", "finance").status_code, 404)
        self.assertEqual(self.call("get", f"/api/workspace/documents/{fin}/file/", "hr").status_code, 404)
        self.assertEqual(self.doc_ids("employee"), {company})

    def test_manager_sees_only_assigned_departments_and_subordinates(self):
        child = Department.objects.create(name="Operations East", parent=self.operations)
        other = Department.objects.create(name="Legal")
        ops = self.upload(department_id=self.operations.pk).json()["document"]["id"]
        east = self.upload(department_id=child.pk, text="East depot rota.").json()["document"]["id"]
        legal = self.upload(department_id=other.pk, text="Legal matter notes.").json()["document"]["id"]
        fin = self.upload(department_id=self.finance_dept.pk, text="Finance ledger notes.").json()["document"]["id"]
        self.assertEqual(self.doc_ids("manager"), {ops, east})
        self.assertNotIn(legal, self.doc_ids("manager"))

        # A subordinate's own private-department document is visible to their manager only.
        subordinate = self.upload("employee", name="mine.txt", text="Draft roster for the week.").json()["document"]["id"]
        self.assertIn(subordinate, self.doc_ids("manager"))
        self.assertNotIn(subordinate, self.doc_ids("finance"))

        # Removing the explicit assignment removes access: department membership is not enough.
        self.persona["manager"].managed_departments.clear()
        self.assertNotIn(east, self.doc_ids("manager"))
        self.assertIn(ops, self.doc_ids("manager"))
        self.assertNotIn(fin, self.doc_ids("manager"))
        # Employees in the parent department do not inherit the child department either.
        self.assertNotIn(east, self.doc_ids("employee"))

    def test_admin_scope_grants_override_department_and_owner_can_go_private(self):
        doc = self.upload(department_id=self.hr_dept.pk, text="Shared onboarding checklist.").json()["document"]["id"]
        self.assertNotIn(doc, self.doc_ids("finance"))
        finance_role = WorkspaceRole.objects.get(code="finance")
        response = self.call("patch", f"/api/workspace/documents/{doc}/", "admin", {
            "access_mode": "scope", "grants": {"roles": [finance_role.pk]},
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.doc_ids("finance"), {doc})
        self.assertEqual(self.doc_ids("hr"), set())  # scope mode drops the department policy
        self.assertEqual(self.doc_ids("ceo"), {doc})  # documents.view_all
        self.assertTrue(AuditEvent.objects.filter(event_type="document.access.update").exists())

        mine = self.upload("employee", name="private.txt", text="My private reminders list.").json()["document"]["id"]
        self.assertIn(mine, self.doc_ids("employee"))
        self.call("patch", f"/api/workspace/documents/{mine}/", "employee", {"access_mode": "scope"})
        self.assertEqual(self.doc_ids("manager") & {mine}, set())
        self.assertIn(mine, self.doc_ids("employee"))
        self.assertIn(mine, self.doc_ids("admin"))

    def test_non_managers_cannot_widen_access_or_upload_elsewhere(self):
        denied = self.upload("employee", department_id=self.finance_dept.pk)
        self.assertEqual(denied.status_code, 403)
        grants = self.upload("employee", grants=json.dumps({"roles": [1]}))
        self.assertEqual(grants.status_code, 403)
        mine = self.upload("employee").json()["document"]["id"]
        response = self.call("patch", f"/api/workspace/documents/{mine}/", "employee", {
            "access_mode": "scope", "grants": {"roles": [1]},
        })
        self.assertEqual(response.status_code, 403)
        other = self.upload("admin", department_id=self.operations.pk, text="Admin owned ops handbook.").json()["document"]["id"]
        self.assertEqual(self.call("delete", f"/api/workspace/documents/{other}/", "employee").status_code, 403)
        self.assertEqual(self.call("delete", f"/api/workspace/documents/{mine}/", "employee").status_code, 200)
        self.assertFalse(os.listdir(os.path.join(self.media.name, "workspace", "documents")) and
                         WorkspaceDocument.objects.filter(pk=mine).exists())

    def test_content_search_is_permission_filtered_and_audited(self):
        self.upload(department_id=self.finance_dept.pk, text="Quartz vendor payment schedule is monthly.")
        found = self.call("get", "/api/workspace/documents/?q=vendor payment schedule", "finance").json()["results"]
        self.assertEqual(len(found), 1)
        self.assertEqual(self.call("get", "/api/workspace/documents/?q=vendor payment schedule", "hr").json()["results"], [])
        event = AuditEvent.objects.filter(event_type="document.search", actor=self.persona["hr"]).get()
        self.assertEqual(event.details["query"], "vendor payment schedule")


class RetrievalTests(WorkspaceTestCase):
    def test_ranking_needs_overlap_and_prefers_better_match(self):
        chunks = [
            DocumentChunk(document_id=1, index=0, text="Annual leave is eighteen days per year."),
            DocumentChunk(document_id=2, index=0, text="Travel requests need approval from a manager."),
        ]
        ranked = rank_chunks(chunks, "How many annual leave days do I get?")
        self.assertEqual([c.document_id for _s, c in ranked], [1])
        self.assertEqual(rank_chunks(chunks, "What is the weather on mars?"), [])
        self.assertTrue(split_chunks([(None, "word " * 1000)]))


class ChatTests(WorkspaceTestCase):
    def test_refuses_without_permitted_source_and_never_calls_provider(self):
        self.upload(department_id=self.finance_dept.pk, text="Finance project Quartz payroll cutoff is the twentieth.")
        with patch("workspace.providers.generate_answer") as generate:
            response = self.ask("hr", "When is the Quartz payroll cutoff?")
        generate.assert_not_called()
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["messages"][1]["status"], "refused")
        self.assertEqual(data["messages"][1]["citations"], [])

    def test_answer_uses_only_permitted_chunks_and_persists_citations(self):
        self.upload(department_id=self.operations.pk, text="Operations project Cedar allows thirty leave days.")
        self.upload(department_id=self.finance_dept.pk, text="Finance project Quartz allows ninety leave days.")
        with patch("workspace.providers.generate_answer", return_value="Thirty days. [Source 1]") as generate:
            response = self.ask("employee", "How many leave days does project Cedar allow?")
            self.ask("employee", "What is Quartz about with ninety?")
        sent = generate.call_args_list[0].args[3]
        self.assertEqual({c.document.department_id for c in sent}, {self.operations.pk})
        self.assertEqual(generate.call_count, 1)  # the Finance question matched nothing the employee may open
        message = response.json()["messages"][1]
        self.assertEqual(message["status"], "answered")
        self.assertEqual(message["citations"][0]["title"], "policy")
        thread_id = response.json()["thread"]["id"]
        stored = self.call("get", f"/api/workspace/chats/{thread_id}/", "employee").json()
        self.assertEqual([m["role"] for m in stored["messages"]], ["user", "assistant"])
        self.assertTrue(stored["thread"]["title"].startswith("How many leave days"))
        self.assertEqual(self.call("get", f"/api/workspace/chats/{thread_id}/", "finance").status_code, 404)
        self.assertEqual(self.call("get", "/api/workspace/chats/", "finance").json()["threads"], [])

    def test_new_chat_with_first_question_leaves_nothing_behind_on_failure(self):
        self.upload(text="Cafeteria opens at noon on weekdays only.")
        payload = {"question": "When does the cafeteria open?", "provider": "gemini"}
        with patch.dict(os.environ, {"DOCUTRUST_GEMINI_API_KEY": ""}):
            failed = self.call("post", "/api/workspace/chats/", data=payload)
        self.assertEqual(failed.status_code, 503)
        self.assertEqual(self.call("get", "/api/workspace/chats/").json()["threads"], [])
        with patch("workspace.providers.generate_answer", return_value="At noon. [Source 1]"):
            created = self.call("post", "/api/workspace/chats/", data={**payload, "provider": "local"})
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(len(created.json()["messages"]), 2)
        self.assertEqual(len(self.call("get", "/api/workspace/chats/").json()["threads"]), 1)

    def test_provider_refusal_text_is_recorded_as_refused(self):
        self.upload(text="Cafeteria opens at noon on weekdays only.")
        with patch("workspace.providers.generate_answer", return_value=providers.REFUSAL_MESSAGE):
            message = self.ask("admin", "When does the cafeteria open?").json()["messages"][1]
        self.assertEqual((message["status"], message["citations"]), ("refused", []))

    def test_unconfigured_provider_returns_503_without_leaking_keys(self):
        self.upload(text="Cafeteria opens at noon on weekdays only.")
        env = {"DOCUTRUST_GEMINI_API_KEY": "", "DOCUTRUST_HOSTED_API_KEY": "hosted-secret", "DOCUTRUST_HOSTED_BASE_URL": ""}
        with patch.dict(os.environ, env):
            gemini = self.ask("admin", "When does the cafeteria open?", provider="gemini")
            hosted = self.ask("admin", "When does the cafeteria open?", provider="hosted")
            catalog = self.call("get", "/api/workspace/models/").content.decode()
        self.assertEqual((gemini.status_code, hosted.status_code), (503, 503))
        self.assertNotIn("hosted-secret", catalog + hosted.content.decode())
        self.assertEqual(AIMessage.objects.count(), 0)
        failed = AuditEvent.objects.filter(event_type="chat.question").first()
        self.assertEqual(failed.details["outcome"], "provider_unavailable")

    def test_invalid_input_and_unknown_model(self):
        thread = self.call("post", "/api/workspace/chats/").json()["thread"]["id"]
        url = f"/api/workspace/chats/{thread}/messages/"
        self.assertEqual(self.call("post", url, data={"question": "  "}).status_code, 400)
        self.assertEqual(self.call("post", url, data={"question": "hi", "provider": "other"}).status_code, 400)
        self.assertEqual(self.call("post", url, data={"question": "hi", "provider": "gemini", "model": "x"}).status_code, 400)


class ProviderAdapterTests(WorkspaceTestCase):
    chunk = DocumentChunk(document_id=1, index=0, text="Leave is thirty days.", page_number=2)

    def setUp(self):
        super().setUp()
        self.chunk.document = WorkspaceDocument(title="Handbook")

    def fake(self, payload):
        response = MagicMock()
        response.read.return_value = json.dumps(payload).encode()
        response.__enter__.return_value = response
        return response

    def test_gemini_adapter_sends_key_in_header_and_parses_text(self):
        env = {"DOCUTRUST_GEMINI_API_KEY": "g-secret", "DOCUTRUST_GEMINI_MODELS": "gem-a,gem-b"}
        reply = self.fake({"candidates": [{"content": {"parts": [{"text": "Thirty "}, {"text": "days."}]}}]})
        with patch.dict(os.environ, env), patch("urllib.request.urlopen", return_value=reply) as urlopen:
            text = providers.generate_answer("gemini", "gem-b", "How long is leave?", [self.chunk])
        request = urlopen.call_args.args[0]
        self.assertEqual(text, "Thirty days.")
        self.assertEqual(
            request.full_url, "https://generativelanguage.googleapis.com/v1beta/models/gem-b:generateContent")
        self.assertEqual(request.get_header("X-goog-api-key"), "g-secret")
        self.assertNotIn("g-secret", request.full_url)
        sent = json.loads(request.data)
        self.assertIn("[Source 1: Handbook, page 2]", sent["contents"][0]["parts"][0]["text"])
        self.assertIn("systemInstruction", sent)

    def test_local_adapter_uses_ollama_chat_endpoint(self):
        env = {"DOCUTRUST_OLLAMA_BASE_URL": "http://ollama.test:11434"}
        reply = self.fake({"message": {"content": "Thirty days."}})
        with patch.dict(os.environ, env), \
                patch("workspace.providers._ollama_models", return_value=["qwen:1b"]), \
                patch("urllib.request.urlopen", return_value=reply) as urlopen:
            text = providers.generate_answer("local", "qwen:1b", "How long is leave?", [self.chunk])
        request = urlopen.call_args.args[0]
        self.assertEqual((text, request.full_url), ("Thirty days.", "http://ollama.test:11434/api/chat"))
        body = json.loads(request.data)
        self.assertEqual((body["model"], body["stream"]), ("qwen:1b", False))

    def test_hosted_adapter_builds_url_and_authorises(self):
        env = {"DOCUTRUST_HOSTED_BASE_URL": "https://llm.example/v1", "DOCUTRUST_HOSTED_API_KEY": "h-secret",
               "DOCUTRUST_HOSTED_MODEL": "big-1"}
        reply = self.fake({"choices": [{"message": {"content": "Thirty days."}}]})
        with patch.dict(os.environ, env), patch("urllib.request.urlopen", return_value=reply) as urlopen:
            text = providers.generate_answer("hosted", "big-1", "How long is leave?", [self.chunk])
        request = urlopen.call_args.args[0]
        self.assertEqual((text, request.full_url), ("Thirty days.", "https://llm.example/v1/chat/completions"))
        self.assertEqual(request.get_header("Authorization"), "Bearer h-secret")

    def test_errors_do_not_leak_provider_bodies_and_missing_config_is_unavailable(self):
        error = urllib.error.HTTPError("https://x", 401, "bad", {}, io.BytesIO(b"key=g-secret"))
        with patch.dict(os.environ, {"DOCUTRUST_GEMINI_API_KEY": "g-secret"}), \
                patch("urllib.request.urlopen", side_effect=error):
            with self.assertRaises(providers.ProviderFailure) as raised:
                providers.generate_answer("gemini", "gem", "q", [self.chunk])
        self.assertNotIn("g-secret", str(raised.exception))
        self.assertIn("401", str(raised.exception))
        with patch.dict(os.environ, {"DOCUTRUST_GEMINI_API_KEY": ""}):
            with self.assertRaises(providers.ProviderUnavailable):
                providers.generate_answer("gemini", "gem", "q", [self.chunk])
        with patch.dict(os.environ, {"DOCUTRUST_HOSTED_BASE_URL": "https://u:p@llm.example", "DOCUTRUST_HOSTED_API_KEY": "k",
                                     "DOCUTRUST_HOSTED_MODEL": "m"}):
            with self.assertRaises(providers.ProviderUnavailable):
                providers.generate_answer("hosted", "m", "q", [self.chunk])

    def test_catalog_reports_state_and_flags_external_providers(self):
        env = {"DOCUTRUST_GEMINI_API_KEY": "", "DOCUTRUST_HOSTED_BASE_URL": "", "DOCUTRUST_AI_PROVIDER": ""}
        with patch.dict(os.environ, env), patch(
            "workspace.providers._ollama_models", return_value=["a", "b", "nomic-embed-text:latest"]
        ):
            catalog = providers.provider_catalog()
        by_id = {p["id"]: p for p in catalog["providers"]}
        self.assertEqual((by_id["local"]["status"], by_id["local"]["models"], by_id["local"]["external"]), ("ready", ["a", "b"], False))
        self.assertEqual((by_id["gemini"]["status"], by_id["gemini"]["external"]), ("not_configured", True))
        self.assertEqual(by_id["hosted"]["status"], "not_configured")
        self.assertEqual(catalog["selected"], {"provider": "local", "model": "a"})
        with patch("workspace.providers._ollama_models", return_value=None):
            self.assertEqual(providers.provider_catalog()["providers"][0]["status"], "unreachable")


class RoomTests(WorkspaceTestCase):
    def test_rooms_scopes_and_messages(self):
        rooms = self.call("get", "/api/workspace/rooms/", "employee").json()["rooms"]
        self.assertEqual([r["name"] for r in rooms], ["General"])
        general = rooms[0]["id"]
        self.assertEqual(self.call("post", f"/api/workspace/rooms/{general}/messages/", "employee", {"content": "Hello team"}).status_code, 201)
        self.assertEqual(self.call("post", "/api/workspace/rooms/", "employee", {"name": "Nope"}).status_code, 403)

        created = self.call("post", "/api/workspace/rooms/", "manager", {
            "name": "Ops standup", "scope": "department", "department_id": self.operations.pk,
        })
        self.assertEqual(created.status_code, 201, created.content)
        room = created.json()["room"]["id"]
        names = lambda user: {r["name"] for r in self.call("get", "/api/workspace/rooms/", user).json()["rooms"]}
        self.assertEqual(names("employee"), {"General", "Ops standup"})
        self.assertEqual(names("finance"), {"General"})
        self.assertEqual(self.call("get", f"/api/workspace/rooms/{room}/messages/", "finance").status_code, 404)

        private = self.call("post", "/api/workspace/rooms/", "manager", {
            "name": "Leads", "scope": "members", "member_ids": [self.persona["finance"].pk],
        }).json()["room"]
        self.assertIn("Leads", names("finance"))
        self.assertNotIn("Leads", names("employee"))
        self.assertIn("Leads", names("ceo"))
        self.call("patch", f"/api/workspace/rooms/{private['id']}/", "manager", {"member_ids": [self.persona["hr"].pk]})
        self.assertIn("Leads", names("hr"))
        self.assertNotIn("Leads", names("finance"))
        self.assertEqual(self.call("post", "/api/workspace/rooms/", "manager", {"name": "Leads"}).status_code, 409)
        self.assertEqual(self.call("delete", f"/api/workspace/rooms/{general}/", "admin").status_code, 403)

        posted = self.call("post", f"/api/workspace/rooms/{room}/messages/", "employee", {"content": "Standup at nine"}).json()
        later = self.call("get", f"/api/workspace/rooms/{room}/messages/?after={posted['message']['id'] - 1}", "manager").json()
        self.assertEqual([m["content"] for m in later["messages"]], ["Standup at nine"])


class DirectoryTests(WorkspaceTestCase):
    def test_admin_manages_departments_roles_and_members(self):
        dept = self.call("post", "/api/workspace/departments/", "admin", {"name": "Legal", "parent_id": self.operations.pk})
        self.assertEqual(dept.status_code, 201, dept.content)
        role = self.call("post", "/api/workspace/roles/", "admin", {"name": "Auditor", "permissions": ["audit.view"]})
        self.assertEqual(role.status_code, 201, role.content)
        member = self.call("post", "/api/workspace/members/", "admin", {
            "display_name": "Lena Legal", "role": "auditor", "department_id": dept.json()["department"]["id"],
            "reports_to_id": self.persona["manager"].pk, "managed_department_ids": [dept.json()["department"]["id"]],
        })
        self.assertEqual(member.status_code, 201, member.content)
        self.assertEqual(member.json()["member"]["reports_to_id"], self.persona["manager"].pk)
        self.assertEqual(self.call("get", "/api/workspace/audit/", "lena-legal").status_code, 200)
        loop = self.call("patch", f"/api/workspace/departments/{self.operations.pk}/", "admin", {"parent_id": dept.json()["department"]["id"]})
        self.assertEqual(loop.status_code, 400)
        busy = self.call("delete", f"/api/workspace/departments/{self.finance_dept.pk}/", "admin")
        self.assertEqual(busy.status_code, 409)
        self.assertEqual(self.call("delete", f"/api/workspace/roles/{role.json()['role']['id']}/", "admin").status_code, 409)

    def test_permission_gates_and_no_privilege_escalation(self):
        self.assertEqual(self.call("post", "/api/workspace/departments/", "manager", {"name": "X"}).status_code, 403)
        self.assertEqual(self.call("post", "/api/workspace/roles/", "ceo", {"name": "Z", "permissions": ["audit.view"]}).status_code, 403)
        self.assertEqual(self.call("post", "/api/workspace/members/", "ceo", {
            "display_name": "Sneaky", "role": "admin"}).status_code, 403)
        ok = self.call("post", "/api/workspace/members/", "ceo", {"display_name": "Nina New", "role": "employee"})
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(self.call("patch", f"/api/workspace/members/{self.persona['admin'].pk}/", "admin", {"is_active": False}).status_code, 409)
        self.assertEqual(self.call("patch", f"/api/workspace/roles/{WorkspaceRole.objects.get(code='admin').pk}/", "admin", {"name": "x"}).status_code, 409)


class AuditTests(WorkspaceTestCase):
    def test_audit_visibility_follows_audit_view_permission(self):
        for user in ("employee", "manager", "finance", "hr"):
            for path in ("/api/workspace/audit/", "/api/workspace/audit/summary/", "/api/workspace/audit/verify/",
                         f"/api/workspace/audit/users/{self.persona['employee'].pk}/"):
                self.assertEqual(self.call("get", path, user).status_code, 403, (user, path))
        for user in ("admin", "ceo"):
            self.assertEqual(self.call("get", "/api/workspace/audit/", user).status_code, 200)
        delegated = WorkspaceRole.objects.create(code="reviewer", name="Reviewer", permissions=["audit.view"])
        DemoPersona.objects.create(username="reviewer", display_name="Reviewer", role=delegated)
        self.assertEqual(self.call("get", "/api/workspace/audit/", "reviewer").status_code, 200)

    def test_person_timeline_shows_searches_uploads_and_shares(self):
        self.upload("employee", name="notes.txt", text="Warehouse inventory counts happen on Fridays.")
        document = WorkspaceDocument.objects.get()
        self.call("patch", f"/api/workspace/documents/{document.pk}/", "employee", {"access_mode": "scope"})
        self.call("get", "/api/workspace/documents/?q=warehouse inventory counts", "employee")
        with patch("workspace.providers.generate_answer", return_value="Fridays. [Source 1]"):
            self.ask("employee", "When do warehouse inventory counts happen?")
        history = self.call("get", f"/api/workspace/audit/users/{self.persona['employee'].pk}/", "admin").json()
        kinds = [e["event_type"] for e in history["events"]]
        for expected in ("document.upload", "document.access.update", "document.search", "chat.question"):
            self.assertIn(expected, kinds)
        question = next(e for e in history["events"] if e["event_type"] == "chat.question")
        self.assertEqual(question["details"]["question"], "When do warehouse inventory counts happen?")
        self.assertEqual(question["details"]["outcome"], "answered")
        self.assertEqual(history["user"]["username"], "employee")
        summary = {p["username"]: p for p in self.call("get", "/api/workspace/audit/summary/", "ceo").json()["people"]}
        self.assertEqual((summary["employee"]["uploads"], summary["employee"]["shares"], summary["employee"]["searches"]), (1, 1, 2))
        self.assertEqual(summary["finance"]["events"], 0)
        self.assertTrue(AuditEvent.objects.filter(event_type="audit.history.view", actor=self.persona["admin"]).exists())

    def test_hash_chain_links_verifies_and_detects_tampering(self):
        first = append_audit(None, "test.one", "t", 1, {"a": 1})
        second = append_audit(None, "test.two", "t", 2, {"b": 2})
        self.assertEqual((second.sequence, second.previous_hash), (first.sequence + 1, first.event_hash))
        self.assertEqual(len(first.event_hash), 64)
        verify = self.call("get", "/api/workspace/audit/verify/", "admin").json()
        self.assertTrue(verify["valid"])
        self.assertEqual(verify["events_checked"], AuditEvent.objects.exclude(event_type="audit.verify").count())

        with self.assertRaises(TypeError):
            first.save()
        with self.assertRaises(TypeError):
            first.delete()
        with self.assertRaises(TypeError):
            AuditEvent.objects.filter(pk=first.pk).update(event_type="x")
        with self.assertRaises(TypeError):
            AuditEvent.objects.all().delete()

        tampered = AuditEvent.objects.get(pk=first.pk)
        tampered.details = {"a": 999}
        tampered.save_base(raw=True, force_update=True)
        verify = self.call("get", "/api/workspace/audit/verify/", "admin").json()
        self.assertFalse(verify["valid"])
        self.assertEqual(verify["first_invalid_sequence"], first.sequence)

    def test_audit_admin_is_read_only(self):
        from django.contrib import admin as django_admin
        from workspace.admin import AuditEventAdmin

        model_admin = AuditEventAdmin(AuditEvent, django_admin.site)
        request = MagicMock()
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))


class CorsTests(WorkspaceTestCase):
    def test_only_configured_origins_are_reflected_without_credentials(self):
        ok = self.client.options("/api/workspace/bootstrap/", HTTP_ORIGIN="http://localhost:3000",
                                 HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET")
        self.assertEqual((ok.status_code, ok["Access-Control-Allow-Origin"]), (204, "http://localhost:3000"))
        self.assertIn("X-Demo-User", ok["Access-Control-Allow-Headers"])
        self.assertNotIn("Access-Control-Allow-Credentials", ok)
        bad = self.client.options("/api/workspace/bootstrap/", HTTP_ORIGIN="https://evil.example",
                                  HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET")
        self.assertEqual(bad.status_code, 403)
        plain = self.client.get("/api/workspace/bootstrap/", HTTP_ORIGIN="https://evil.example")
        self.assertNotIn("Access-Control-Allow-Origin", plain)


class NotesAndAnnouncementsTests(WorkspaceTestCase):
    def test_notes_are_private_to_their_owner(self):
        created = self.call("post", "/api/workspace/notes/", "finance", {"title": "Q4 close", "body": "Chase invoices"})
        self.assertEqual(created.status_code, 201)
        note_id = created.json()["note"]["id"]
        self.assertEqual(len(self.call("get", "/api/workspace/notes/", "finance").json()["notes"]), 1)
        self.assertEqual(self.call("get", "/api/workspace/notes/", "hr").json()["notes"], [])
        self.assertEqual(self.call("patch", f"/api/workspace/notes/{note_id}/", "hr", {"body": "x"}).status_code, 404)
        self.assertEqual(self.call("delete", f"/api/workspace/notes/{note_id}/", "hr").status_code, 404)

    def test_note_can_be_edited_pinned_and_deleted(self):
        note_id = self.call("post", "/api/workspace/notes/", "admin", {"title": "Draft"}).json()["note"]["id"]
        edited = self.call("patch", f"/api/workspace/notes/{note_id}/", "admin", {"body": "Body", "pinned": True}).json()["note"]
        self.assertEqual((edited["title"], edited["body"], edited["pinned"]), ("Draft", "Body", True))
        self.assertEqual(self.call("patch", f"/api/workspace/notes/{note_id}/", "admin", {"pinned": "yes"}).status_code, 400)
        self.assertEqual(self.call("delete", f"/api/workspace/notes/{note_id}/", "admin").status_code, 200)
        self.assertEqual(self.call("get", "/api/workspace/notes/", "admin").json()["notes"], [])

    def test_everyone_reads_announcements_only_permitted_roles_post(self):
        posted = self.call("post", "/api/workspace/announcements/", "admin",
                           {"title": "Policy review", "body": "Please read.", "level": "important", "pinned": True})
        self.assertEqual(posted.status_code, 201)
        self.assertEqual(self.call("post", "/api/workspace/announcements/", "employee", {"title": "Hi"}).status_code, 403)
        listed = self.call("get", "/api/workspace/announcements/", "employee").json()["announcements"]
        self.assertEqual([a["title"] for a in listed], ["Policy review"])
        self.assertEqual(listed[0]["level"], "important")
        self.assertTrue(self.call("get", "/api/workspace/bootstrap/", "admin").json()["capabilities"]["manage_announcements"])
        self.assertFalse(self.call("get", "/api/workspace/bootstrap/", "employee").json()["capabilities"]["manage_announcements"])

    def test_announcement_changes_are_audited_and_validated(self):
        self.assertEqual(self.call("post", "/api/workspace/announcements/", "admin", {"title": ""}).status_code, 400)
        self.assertEqual(self.call("post", "/api/workspace/announcements/", "admin", {"title": "T", "level": "loud"}).status_code, 400)
        item_id = self.call("post", "/api/workspace/announcements/", "admin", {"title": "Old"}).json()["announcement"]["id"]
        self.call("patch", f"/api/workspace/announcements/{item_id}/", "admin", {"title": "New"})
        self.assertEqual(self.call("delete", f"/api/workspace/announcements/{item_id}/", "employee").status_code, 403)
        self.call("delete", f"/api/workspace/announcements/{item_id}/", "admin")
        types = list(AuditEvent.objects.values_list("event_type", flat=True))
        self.assertEqual([t for t in types if t.startswith("announcement.")],
                         ["announcement.create", "announcement.update", "announcement.delete"])
        self.assertTrue(self.call("get", "/api/workspace/audit/verify/", "admin").json()["valid"])
