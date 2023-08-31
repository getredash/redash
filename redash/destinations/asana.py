import logging
import textwrap

import requests

from redash.destinations import BaseDestination, register
from redash.models import Alert


class Asana(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "pat": {"type": "string", "title": "Asana Personal Access Token"},
                "project_id": {"type": "string", "title": "Asana Project ID"},
            },
            "secret": ["pat"],
            "required": ["pat", "project_id"],
        }

    @classmethod
    def icon(cls):
        return "fa-asana"

    @property
    def api_base_url(self):
        return "https://app.asana.com/api/1.0/tasks"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        # Documentation: https://developers.asana.com/docs/tasks
        state = "TRIGGERED" if new_state == Alert.TRIGGERED_STATE else "RECOVERED"

        notes = textwrap.dedent(
            f"""
        {alert.name} has {state}.

        Query: {host}/queries/{query.id}
        Alert: {host}/alerts/{alert.id}
        """
        ).strip()

        data = {
            "name": f"[Redash Alert] {state}: {alert.name}",
            "notes": notes,
            "projects": [options["project_id"]],
        }

        try:
            resp = requests.post(
                self.api_base_url,
                data=data,
                timeout=5.0,
                headers={"Authorization": f"Bearer {options['pat']}"},
            )
            logging.warning(resp.text)
            if resp.status_code != 201:
                logging.error("Asana send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception as e:
            logging.exception("Asana send ERROR. {exception}".format(exception=e))


register(Asana)
