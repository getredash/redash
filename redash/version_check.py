import logging
import requests
import semver

from redash import __version__ as current_version
from redash import redis_connection
from redash.models import db, Organization
from redash.utils import json_dumps

REDIS_KEY = "new_version_available"


def usage_data():
    counts_query = """
    SELECT 'users_count' as name, count(0) as value
    FROM users
    WHERE disabled_at is null

    UNION ALL

    SELECT 'queries_count' as name, count(0) as value
    FROM queries
    WHERE is_archived is false

    UNION ALL

    SELECT 'alerts_count' as name, count(0) as value
    FROM alerts

    UNION ALL

    SELECT 'dashboards_count' as name, count(0) as value
    FROM dashboards
    WHERE is_archived is false

    UNION ALL

    SELECT 'widgets_count' as name, count(0) as value
    FROM widgets
    WHERE visualization_id is not null

    UNION ALL

    SELECT 'textbox_count' as name, count(0) as value
    FROM widgets
    WHERE visualization_id is null
    """

    data_sources_query = "SELECT type, count(0) FROM data_sources GROUP by 1"
    visualizations_query = "SELECT type, count(0) FROM visualizations GROUP by 1"
    destinations_query = (
        "SELECT type, count(0) FROM notification_destinations GROUP by 1"
    )

    data = {name: value for (name, value) in db.session.execute(counts_query)}
    data["data_sources"] = {
        name: value for (name, value) in db.session.execute(data_sources_query)
    }
    data["visualization_types"] = {
        name: value for (name, value) in db.session.execute(visualizations_query)
    }
    data["destination_types"] = {
        name: value for (name, value) in db.session.execute(destinations_query)
    }

    return data


def run_version_check():
    logging.info("Performing version check.")
    logging.info("Current version: %s", current_version)

    data = {"current_version": current_version}

    if Organization.query.first().get_setting("beacon_consent"):
        data["usage"] = usage_data()

    try:
        response = requests.post(
            "https://version.redash.io/api/report?channel=stable",
            json=data,
            timeout=3.0,
        )
        latest_version = response.json()["release"]["version"]

        _compare_and_update(latest_version)
    except requests.RequestException:
        logging.exception("Failed checking for new version.")
    except (ValueError, KeyError):
        logging.exception(
            "Failed checking for new version (probably bad/non-JSON response)."
        )


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
