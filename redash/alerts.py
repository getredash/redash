from enum import Enum


class Alerts(str, Enum):
    UNKNOWN_STATE = "unknown"
    OK_STATE = "ok"
    TRIGGERED_STATE = "triggered"
