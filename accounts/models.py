"""Workspace user model, decided before the first Django migration."""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Django user extended with the workspace fields carried over from the FYP schema."""

    class Roles(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        DEPARTMENT = "department", "Department"
        ADMIN = "admin", "Administrator"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.EMPLOYEE)
    department = models.CharField(max_length=120, blank=True, default="")

    def __str__(self) -> str:
        return self.get_username()
