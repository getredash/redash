from flask import request

from redash.models import db
from redash.handlers.base import BaseResource
from redash.permissions import require_admin
from redash.settings.organization import settings as org_settings


def get_settings_with_defaults(defaults, values):
    settings = {}

    for setting, default_value in defaults.iteritems():
        current_value = values.get(setting)
        if current_value is None and default_value is None:
            continue

        if current_value is None:
            settings[setting] = default_value
        else:
            settings[setting] = current_value

    return settings


class OrganizationSettings(BaseResource):
    @require_admin
    def get(self):
        current_values = self.current_org.settings.get('settings', {})
        settings = get_settings_with_defaults(org_settings, current_values)

        return {
            "settings": settings
        }

    @require_admin
    def post(self):
        new_values = request.json

        if self.current_org.settings.get('settings') is None:
            self.current_org.settings['settings'] = {}

        for k, v in new_values.iteritems():
            self.current_org.set_setting(k, v)

        db.session.add(self.current_org)
        db.session.commit()

        settings = get_settings_with_defaults(org_settings, self.current_org.settings['settings'])

        return {
            "settings": settings
        }
