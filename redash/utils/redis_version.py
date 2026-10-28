import logging

import redis

logger = logging.getLogger(__name__)

# RQ 2 doesn't support older Redis servers.
MINIMUM_REDIS_VERSION = (5, 0)


class UnsupportedRedisVersion(Exception):
    pass


def parse_version(version):
    return tuple(int(part) for part in str(version).split(".")[:2])


def check_redis_version(connection):
    try:
        version = connection.info("server")["redis_version"]
    except redis.ResponseError as e:
        # Some managed Redis services disable the INFO command.
        logger.warning("Couldn't check the Redis server version: %s", e)
        return

    if parse_version(version) < MINIMUM_REDIS_VERSION:
        minimum = ".".join(str(part) for part in MINIMUM_REDIS_VERSION)
        raise UnsupportedRedisVersion(
            f"Redash requires Redis {minimum} or later, but the Redis server it's connected to "
            f"is running Redis {version}. Please upgrade Redis."
        )
