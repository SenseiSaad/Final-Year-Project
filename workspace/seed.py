"""Seed data for the demo workspace, shared by migrations and a management command."""

PERMISSIONS = [
    ("documents.view_all", "View every document", "Read, search and cite any document regardless of department."),
    ("documents.manage", "Manage documents", "Upload to any department and define access scopes or grants for any document."),
    ("rooms.create", "Create team rooms", "Add rooms and control their scope and members."),
    ("rooms.view_all", "View every room", "Open all rooms, including department and member-only rooms."),
    ("departments.manage", "Manage departments", "Create, rename, nest and remove departments."),
    ("members.manage", "Manage members", "Add members, change roles, departments and reporting lines."),
    ("roles.manage", "Manage roles", "Create roles and edit their permissions."),
    ("audit.view", "View audit log", "Open the audit log, person timelines and integrity checks."),
    ("announcements.manage", "Manage announcements", "Post, pin and remove workspace announcements."),
]

ROLES = [
    ("admin", "Admin", "Full workspace control.", ["*"]),
    (
        "ceo",
        "CEO",
        "Executive oversight across departments.",
        ["documents.view_all", "rooms.view_all", "rooms.create", "departments.manage", "members.manage", "audit.view", "announcements.manage"],
    ),
    ("manager", "Manager", "Leads the departments explicitly assigned to them.", ["rooms.create"]),
    ("finance", "Finance", "Finance department member.", []),
    ("hr", "HR", "Human resources department member.", []),
    ("employee", "Employee", "Standard member.", []),
]

DEPARTMENTS = ["Operations", "Finance", "Human Resources"]

# username, display name, role, department, reports to, managed departments
PERSONAS = [
    ("admin", "Admin", "admin", None, None, []),
    ("ceo", "Chief Executive", "ceo", None, None, []),
    ("manager", "Mariam Manager", "manager", "Operations", "ceo", ["Operations"]),
    ("finance", "Farhan Finance", "finance", "Finance", "ceo", []),
    ("hr", "Hina HR", "hr", "Human Resources", "ceo", []),
    ("employee", "Ahmed Employee", "employee", "Operations", "manager", []),
]

PROTECTED_USERNAMES = {row[0] for row in PERSONAS}


def seed(*, Role, Department, Persona, Room):
    """Create the initial workspace. Idempotent; never overwrites later edits."""
    roles = {}
    for code, name, description, permissions in ROLES:
        roles[code], _ = Role.objects.get_or_create(
            code=code,
            defaults={"name": name, "description": description, "permissions": permissions, "is_system": True},
        )
    departments = {}
    for name in DEPARTMENTS:
        departments[name], _ = Department.objects.get_or_create(name=name)

    created = {}
    for username, display, role_code, dept, _reports, _managed in PERSONAS:
        created[username] = Persona.objects.get_or_create(
            username=username,
            defaults={
                "display_name": display,
                "role": roles[role_code],
                "department": departments[dept] if dept else None,
            },
        )
    personas = {username: persona for username, (persona, _new) in created.items()}

    for username, _display, _role, _dept, reports, managed in PERSONAS:
        persona, is_new = created[username]
        if not is_new:
            continue
        if reports:
            persona.reports_to = personas[reports]
            persona.save(update_fields=["reports_to"])
        persona.managed_departments.set([departments[name] for name in managed])

    Room.objects.get_or_create(
        name="General",
        defaults={
            "is_general": True,
            "scope": "workspace",
            "description": "Workspace-wide room for announcements and questions.",
        },
    )
