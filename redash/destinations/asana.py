import logging
import textwrap

import requests

from redash.destinations import *


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
        }

    @classmethod
    def icon(cls):
        return "fa-sticky-note-o"

    def notify(self, alert, query, user, new_state, app, host, options):
        # Documentation: https://developers.asana.com/docs/tasks
        state = "TRIGGERED" if new_state == "triggered" else "RECOVERED"

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
            "projects": [options.get("project_id")],
        }

        try:
            resp = requests.post(
                "https://app.asana.com/api/1.0/tasks",
                data=data,
                timeout=5.0,
                headers={"Authorization": f"Bearer {options.get('pat')}"},
            )
            logging.warning(resp.text)
            if resp.status_code != 201:
                logging.error("Asana send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Asana send ERROR.")


register(Asana)
