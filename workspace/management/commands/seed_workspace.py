from django.core.management.base import BaseCommand

from workspace.models import DemoPersona, Department, TeamRoom, WorkspaceRole
from workspace.seed import seed


class Command(BaseCommand):
    help = "Create the demo roles, departments, personas and General room if they are missing."

    def handle(self, *args, **options):
        seed(Role=WorkspaceRole, Department=Department, Persona=DemoPersona, Room=TeamRoom)
        self.stdout.write(self.style.SUCCESS("Workspace seed data is in place."))
