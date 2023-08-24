import logging

from redash.destinations import BaseDestination, register

enabled = True

try:
    import pypd
except ImportError:
    enabled = False


class PagerDuty(BaseDestination):
    KEY_STRING = "{alert_id}_{query_id}"
    DESCRIPTION_STR = "Alert: {alert_name}"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "integration_key": {
                    "type": "string",
                    "title": "PagerDuty Service Integration Key",
                },
                "description": {
                    "type": "string",
                    "title": "Description for the event, defaults to alert name",
                },
            },
            "secret": ["integration_key"],
            "required": ["integration_key"],
        }

    @classmethod
    def icon(cls):
        return "creative-commons-pd-alt"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        if alert.custom_subject:
            default_desc = alert.custom_subject
        elif options.get("description"):
            default_desc = options.get("description")
        else:
            default_desc = self.DESCRIPTION_STR.format(alert_name=alert.name)

        incident_key = self.KEY_STRING.format(alert_id=alert.id, query_id=query.id)
        data = {
            "routing_key": options.get("integration_key"),
            "incident_key": incident_key,
            "dedup_key": incident_key,
            "payload": {
                "summary": default_desc,
                "severity": "error",
                "source": "redash",
            },
        }

        if alert.custom_body:
            data["payload"]["custom_details"] = alert.custom_body

        if new_state == "triggered":
            data["event_action"] = "trigger"
        elif new_state == "unknown":
            logging.info("Unknown state, doing nothing")
            return
        else:
            data["event_action"] = "resolve"

        try:
            ev = pypd.EventV2.create(data=data)
            logging.warning(ev)

        except Exception:
            logging.exception("PagerDuty trigger failed!")


register(PagerDuty)
