import logging
from enum import Enum
from re import sub

from pydantic import BaseModel, Field

from redash.query_runner.ai.ai_conf_query_runner import get_conf_query_runner

logger = logging.getLogger(__name__)


class AlertOperators(Enum):
    GREATER_THAN = ">"
    LESS_THAN = "<"
    EQUALS = "=="
    NOT_EQUALS = "!="
    GREATER_THAN_OR_EQUAL = ">="
    LESS_THAN_OR_EQUAL = "<="


class AlertSelectors(Enum):
    FIRST = "first"
    MIN = "min"
    MAX = "max"


class AlertConfiguration(BaseModel):
    column: str = Field(..., description="The name of the column to which the condition applies.")
    op: AlertOperators = Field(
        ..., description="The operator used for the condition ['>', '<', '==', '!=', '>=', '<=']."
    )
    selector: AlertSelectors = Field(..., description="The selector used for the condition ['first', 'min', 'max'].")
    value: float = Field(..., description="The value against which the column is compared.")

    def to_dict(self):
        return {
            "column": self.column,
            "op": self.op.value,
            "selector": self.selector.value,
            "value": self.value,
            "muted": False,
        }


class AlertsTiles(BaseModel):
    alerts: list[str] = Field(..., description="The list of the suggested alert names.")

    def to_dict(self):
        return {
            "alerts": self.alerts,
        }


class AlertsGenerator:
    def __init__(self, query_runner, data, query):
        self.ai = get_conf_query_runner(query_runner)

        self.query = query

        self.data = str(
            {
                "columns": data.get("columns", []),
                "rows": data.get("rows", [])[:10],
            }
        )

    def config_alert(self, alert_name: str) -> AlertConfiguration:
        """
        Generate a configuration for the alert based on the alert name.
        """

        alert = self.ai.prompt(
            AlertConfiguration,
            f'Alert title: "{alert_name}"\n\nHere is the data: {self.data}\n\nHere is the query: {self.query}',
            f"You are a helpful assistant that suggests appropriate alert configurations based on the provided data and alert title. Your task is to analyze the data, query and alert name to provide a configuration. Return the result as a valid JSON object with the following structure: {AlertConfiguration.model_json_schema()}. Do not include any explanations or additional text.",
            [
                {
                    "user": "Alert title: We reached 1000 users\n\nHere is the data: {{'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 22}]}\n\nHere is the query: SELECT count(*) as count FROM users",
                    "assistant": '{"column": "count", "op": "==", "selector": "first", "value": 1000}',
                },
                {
                    "user": "Alert title: \"We reached a million users\"\n\nHere is the data: {{'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 22}]}\n\nHere is the query: SELECT count(*) as count FROM users",
                    "assistant": '{"column": "count", "op": "==", "selector": "first", "value": 1000000}',
                },
            ],
        )

        logger.debug(f"AI suggested alerts: {alert}")

        return alert

    def suggest_alerts(self) -> list[str]:
        """
        Suggest appropriate alerts based on the data.
        """

        choices = self.ai.prompt(
            AlertsTiles,
            f"Here is the data: {self.data}\n\nHere is the query: {self.query}",
            f"You are a helpful assistant that suggests appropriate alerts based on the provided data. Your task is to analyze the data and suggest as many different meaningful alert titles as possible for the given data and query. The suggestions should be oriented on BI, things like KPI, income, revenue, data anomalies, pattern anomalies, users or customers behavior. Return the results as a valid JSON object with the following structure: {AlertsTiles.model_json_schema()}. No specific dates. Do not include any explanations or additional text.",
            [
                {
                    "user": "Here is the data: {'columns': [{'name': 'count', 'friendly_name': 'count', 'type': 'integer'}], 'rows': [{'count': 22}]}\n\nHere is the query: SELECT count(*) as count FROM users",
                    "assistant": '{"alerts": ["We reached 1000 users", "We reached a million users", "No users"]}',
                },
            ],
        ).get("alerts", [])

        logger.debug(f"AI suggested alerts: {choices}")

        return choices

    def get_alerts(self) -> list:
        """
        Generate alerts based on the data.
        """

        max_alerts = 10
        alerts_to_create = self.suggest_alerts()
        alerts = []
        known_alerts = set()
        known_alert_names = set()

        for alert_name in alerts_to_create:
            if len(alerts) == max_alerts:
                break

            if alert_name in known_alert_names:
                logger.warning(f"Duplicate alert name '{alert_name}' detected. Skipping.")
                continue  # Skip if an alert with the same name already exists

            alert = self.config_alert(alert_name)

            alert_key = " ".join(
                [alert["selector"], alert["column"], alert["op"], sub(r"\.0$", "", str(alert["value"]))]
            )

            if alert_key in known_alerts:
                logger.warning(f"Duplicate alert configuration '{alert_key}' detected. Skipping.")
                continue  # Skip if an alert with the same configuration already exists

            try:
                alerts.append(
                    {
                        "key": alert_key,
                        "name": alert_name,
                        "options": alert,
                    }
                )

                known_alerts.add(alert_key)
                known_alert_names.add(alert_name)
            except Exception as e:
                logger.error(f"Failed to generate alert configuration for '{alert_name}': {e}")

        logger.debug(f"AI generated alerts: {alerts}")

        return alerts
