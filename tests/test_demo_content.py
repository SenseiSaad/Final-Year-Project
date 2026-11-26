"""Tests for the ``seed_demo_content`` management command (fictional Karachi logistics company)."""

import io
import tempfile
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.utils import timezone

from test_workspace import WorkspaceTestCase
from workspace import providers
from workspace.audit import verify_chain
from workspace.models import (
    AIMessage,
    AIThread,
    Announcement,
    AuditEvent,
    DemoPersona,
    Department,
    DocumentChunk,
    Note,
    TeamMessage,
    TeamRoom,
    WorkspaceDocument,
)


class DemoContentTests(WorkspaceTestCase):
    @classmethod
    def setUpTestData(cls):
        cls._media = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls._media.cleanup)
        cls.first_output = io.StringIO()
        with override_settings(MEDIA_ROOT=cls._media.name):
            call_command("seed_demo_content", stdout=cls.first_output)

    def counts(self):
        return (
            WorkspaceDocument.objects.count(), AuditEvent.objects.count(), TeamMessage.objects.count(),
            AIMessage.objects.count(), Announcement.objects.count(), Note.objects.count(), DemoPersona.objects.count(),
        )

    def test_second_run_changes_nothing(self):
        before = self.counts()
        out = io.StringIO()
        call_command("seed_demo_content", stdout=out)
        self.assertIn("already present", out.getvalue())
        self.assertEqual(before, self.counts())
        self.assertIn("audit chain valid", self.first_output.getvalue())

    def test_audit_chain_is_valid_and_ordered_by_time(self):
        valid, checked, first_invalid, _head = verify_chain()
        self.assertTrue(valid, first_invalid)
        self.assertGreater(checked, 100)
        stamps = list(AuditEvent.objects.order_by("sequence").values_list("timestamp", flat=True))
        self.assertEqual(stamps, sorted(stamps))
        types = set(AuditEvent.objects.values_list("event_type", flat=True))
        for expected in (
            "document.upload", "document.search", "document.access.update", "document.delete", "chat.question",
            "chat.thread.create", "team.message.create", "team.room.create", "announcement.create", "member.create",
            "department.create", "role.create", "audit.verify",
        ):
            self.assertIn(expected, types)

    def test_timestamps_cover_the_last_few_weeks(self):
        now = timezone.now()
        stamps = list(AuditEvent.objects.values_list("timestamp", flat=True))
        self.assertGreaterEqual(max(stamps) - min(stamps), timedelta(days=14))
        self.assertLess(max(stamps), now)
        self.assertGreater(min(stamps), now - timedelta(days=30))
        for model in (WorkspaceDocument, TeamMessage, AIMessage, Announcement, Note, AIThread):
            values = list(model.objects.values_list("created_at", flat=True))
            self.assertTrue(values, model)
            self.assertLess(max(values), now, model)
            self.assertGreater(min(values), now - timedelta(days=30), model)
        uploads = WorkspaceDocument.objects.order_by("created_at")
        self.assertGreaterEqual(uploads.last().created_at - uploads.first().created_at, timedelta(days=2))

    def test_documents_are_rich_and_access_varies(self):
        documents = WorkspaceDocument.objects.all()
        self.assertTrue(10 <= documents.count() <= 12)
        self.assertEqual({d.original_filename.rsplit(".", 1)[-1] for d in documents}, {"md", "txt", "docx"})
        for document in documents:
            self.assertGreaterEqual(document.chunks.count(), 3, document.title)
        # One extra upload was a draft policy that Finance deleted again.
        self.assertEqual(AuditEvent.objects.filter(event_type="document.upload").count(), documents.count() + 1)
        admin_docs, employee_docs = self.doc_ids("admin"), self.doc_ids("employee")
        self.assertEqual(len(admin_docs), documents.count())
        self.assertLess(len(employee_docs), len(admin_docs))
        self.assertGreaterEqual(len(employee_docs), 4)
        titles = {d.pk: d.title for d in documents}

        def visible(username):
            return {titles[pk] for pk in self.doc_ids(username)}

        for restricted in ("Salary Review Process", "Vendor Payment Procedure", "Board Meeting Notes"):
            self.assertNotIn(restricted, visible("employee"))
        self.assertIn("Salary Review Process", visible("hr"))
        self.assertNotIn("Salary Review Process", visible("finance"))
        self.assertIn("Vendor Payment Procedure", visible("finance"))
        self.assertNotIn("Vendor Payment Procedure", visible("hr"))
        self.assertIn("Board Meeting Notes", visible("ceo"))
        restricted_modes = {
            d.access_mode for d in documents
            if d.title in {"Salary Review Process", "Vendor Payment Procedure", "Board Meeting Notes"}
        }
        self.assertEqual(restricted_modes, {"scope"})

    def test_policy_facts_match_the_marketing_site(self):
        def text(title):
            chunks = DocumentChunk.objects.filter(document__title=title).order_by("index")
            return " ".join(chunks.values_list("text", flat=True))

        leave = text("Leave Policy")
        for phrase in ("up to five unused annual leave days", "31 March", "before 15 December"):
            self.assertIn(phrase, leave)
        expense = text("Travel and Expense Policy")
        self.assertIn("above PKR 40,000", expense)
        self.assertIn("written pre-approval from your line manager before booking", expense)
        self.assertIn("not reimbursed", expense)
        remote = text("Remote Work Policy")
        self.assertIn("up to two days per week", remote)
        self.assertIn("Fridays are allowed", remote)

    def test_people_and_structure(self):
        self.assertEqual(DemoPersona.objects.filter(is_active=True).count(), 15)
        self.assertEqual(DemoPersona.objects.get(username="admin").role.code, "admin")
        self.assertEqual(DemoPersona.objects.get(username="ceo").role.code, "ceo")
        for persona in DemoPersona.objects.all():
            self.assertNotIn("Employee", persona.display_name)
            self.assertNotIn(" HR", persona.display_name)
        self.assertIsNone(DemoPersona.objects.get(username="ceo").reports_to)
        self.assertEqual(Department.objects.get(name="Logistics").parent.name, "Operations")
        self.assertTrue(Department.objects.filter(name="Information Technology", parent=None).exists())
        self.assertEqual(TeamRoom.objects.filter(is_general=True).count(), 1)

    def test_chats_have_grounded_citations_and_a_refusal(self):
        refused = AIMessage.objects.filter(status=AIMessage.Status.REFUSED)
        self.assertGreaterEqual(refused.count(), 1)
        for message in refused:
            self.assertEqual(message.content, providers.REFUSAL_MESSAGE)
            self.assertEqual(message.citations, [])
        answered = AIMessage.objects.filter(status=AIMessage.Status.ANSWERED)
        self.assertGreaterEqual(answered.count(), 8)
        for message in answered:
            self.assertTrue(message.citations)
            self.assertEqual(message.provider, "local")
            self.assertTrue(message.model)
            self.assertEqual({c["source"] for c in message.citations}, set(range(1, len(message.citations) + 1)))
            self.assertIn("[Source 1]", message.content)
        self.assertGreaterEqual(AIThread.objects.filter(owner__username="admin").count(), 4)
        self.assertEqual(AuditEvent.objects.filter(event_type="chat.thread.create").count(), AIThread.objects.count())
        admin_chats = self.call("get", "/api/workspace/chats/", "admin").json()["threads"]
        self.assertGreaterEqual(len(admin_chats), 4)
        thread = self.call("get", f"/api/workspace/chats/{admin_chats[0]['id']}/", "admin").json()
        self.assertEqual([m["role"] for m in thread["messages"]][:2], ["user", "assistant"])

    def test_rooms_announcements_and_notes(self):
        for room in TeamRoom.objects.all():
            self.assertTrue(8 <= room.messages.count() <= 25, room.name)
        self.assertGreaterEqual(TeamRoom.objects.exclude(is_general=True).count(), 5)
        self.assertTrue(TeamRoom.objects.filter(scope="members").exists())
        self.assertTrue(TeamRoom.objects.filter(scope="department").exists())
        self.assertEqual(len(self.call("get", "/api/workspace/rooms/", "employee").json()["rooms"]), 2)

        announcements = Announcement.objects.all()
        self.assertTrue(5 <= announcements.count() <= 6)
        self.assertTrue(1 <= announcements.filter(pinned=True).count() <= 2)
        self.assertTrue(announcements.filter(level="important").exists())
        self.assertEqual({a.author.username for a in announcements}, {"admin"})
        # A duplicate was posted by mistake and deleted again.
        self.assertEqual(AuditEvent.objects.filter(event_type="announcement.create").count(), announcements.count() + 1)

        notes = Note.objects.all()
        self.assertTrue(5 <= notes.count() <= 6)
        self.assertEqual({n.owner.username for n in notes}, {"admin"})
        self.assertTrue(1 <= notes.filter(pinned=True).count() <= 2)
        self.assertEqual(self.call("get", "/api/workspace/notes/", "employee").json()["notes"], [])
        self.assertEqual(len(self.call("get", "/api/workspace/notes/", "admin").json()["notes"]), notes.count())

    def test_api_endpoints_respond(self):
        for path in ("bootstrap", "documents", "chats", "rooms", "announcements", "notes", "audit", "members", "departments"):
            self.assertEqual(self.call("get", f"/api/workspace/{path}/", "admin").status_code, 200, path)

    def test_reset_is_refused_while_audit_events_exist(self):
        before = self.counts()
        with self.assertRaisesMessage(CommandError, "delete the SQLite database file"):
            call_command("seed_demo_content", reset=True, stdout=io.StringIO())
        self.assertEqual(before, self.counts())
