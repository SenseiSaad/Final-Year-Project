"""Early-access requests sent from the public landing page."""

from django.db import models


class EarlyAccessRequest(models.Model):
    """One request from the landing page form. Stored locally and reviewed in Django admin."""

    class TeamSize(models.TextChoices):
        SMALL = "1-10", "1 to 10 people"
        MEDIUM = "11-50", "11 to 50 people"
        LARGE = "51-200", "51 to 200 people"
        XLARGE = "200+", "More than 200 people"

    class Plan(models.TextChoices):
        PILOT = "pilot", "Pilot"
        TEAM = "team", "Team"

    name = models.CharField("Full name", max_length=120)
    email = models.EmailField("Work email")
    organisation = models.CharField(max_length=160)
    team_size = models.CharField(max_length=10, choices=TeamSize.choices)
    plan = models.CharField("Interested in", max_length=10, choices=Plan.choices, default=Plan.PILOT)
    note = models.TextField("What would you use it for", max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False, help_text="Tick once you have replied.")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "early access request"

    def __str__(self) -> str:
        return f"{self.name} · {self.organisation}"
