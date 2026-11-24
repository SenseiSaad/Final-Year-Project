"""Validation for early-access requests sent by the Next.js site."""

from django import forms

from site_pages.models import EarlyAccessRequest


class EarlyAccessForm(forms.ModelForm):
    # Hidden from people, filled in by most spam bots
    website = forms.CharField(required=False)

    class Meta:
        model = EarlyAccessRequest
        fields = ["name", "email", "organisation", "team_size", "plan", "note"]
        error_messages = {
            "name": {"required": "Enter your full name"},
            "email": {"required": "Enter your work email", "invalid": "Enter an email address like name@company.com"},
            "organisation": {"required": "Enter your organisation"},
            "team_size": {"required": "Choose a team size", "invalid_choice": "Choose a team size"},
            "plan": {"required": "Choose a plan", "invalid_choice": "Choose a plan"},
        }
