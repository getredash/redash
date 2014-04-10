import logging
import json

logger = logging.getLogger("events")


def record_event(event):
    logger.info(json.dumps(event))