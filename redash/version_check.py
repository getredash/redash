import logging
import requests
import semver

from redash import __version__ as current_version
from redash import redis_connection
from redash.utils import json_dumps

REDIS_KEY = "new_version_available"


def run_version_check():
    logging.info("Performing version check.")
    logging.info("Current version: %s", current_version)

    data = json_dumps({
        'current_version': current_version
    })
    headers = {'content-type': 'application/json'}

    try:
        response = requests.post('https://version.redash.io/api/report?channel=stable',
                                 data=data, headers=headers, timeout=3.0)
        latest_version = response.json()['release']['version']

        _compare_and_update(latest_version)
    except requests.RequestException:
        logging.exception("Failed checking for new version.")
    except (ValueError, KeyError):
        logging.exception("Failed checking for new version (probably bad/non-JSON response).")


def reset_new_version_status():
    latest_version = get_latest_version()
    if latest_version:
        _compare_and_update(latest_version)


def get_latest_version():
    return redis_connection.get(REDIS_KEY)


def _compare_and_update(latest_version):
    # TODO: support alpha channel (allow setting which channel to check & parse build number)
    is_newer = semver.compare(current_version, latest_version) == -1
    logging.info("Latest version: %s (newer: %s)", latest_version, is_newer)

    if is_newer:
        redis_connection.set(REDIS_KEY, latest_version)
    else:
        redis_connection.delete(REDIS_KEY)
