from django.db import migrations

from workspace.seed import seed


def create_seed_data(apps, schema_editor):
    seed(
        Role=apps.get_model("workspace", "WorkspaceRole"),
        Department=apps.get_model("workspace", "Department"),
        Persona=apps.get_model("workspace", "DemoPersona"),
        Room=apps.get_model("workspace", "TeamRoom"),
    )


class Migration(migrations.Migration):
    dependencies = [("workspace", "0001_initial")]

    operations = [migrations.RunPython(create_seed_data, migrations.RunPython.noop)]
