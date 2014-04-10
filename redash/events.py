import logging
import json

logger = logging.getLogger("redash.events")
logger.propagate = False


def setup_logging(log_path, console_output=False):
    if log_path:
        fh = logging.FileHandler(log_path)
        formatter = logging.Formatter('%(message)s')
        fh.setFormatter(formatter)
        logger.addHandler(fh)

    if console_output:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('[%(name)s] %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)


def record_event(event):
    logger.info(json.dumps(event))