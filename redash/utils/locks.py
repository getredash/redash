import logging
import random
import time
import uuid

from redis import WatchError

from redash import redis_connection

logger = logging.getLogger(__name__)


def acquire_lock(name, acquire_timeout=10, lock_timeout=5):
    identifier = str(uuid.uuid4())
    lock_name = f"lock:{name}"
    end = time.time() + acquire_timeout

    base_delay = 0.001
    max_delay = 0.05

    while time.time() < end:
        if redis_connection.set(lock_name, identifier, ex=lock_timeout, nx=True):
            logger.info("acquire_lock, lock_name=[%s], identifier=[%s]", lock_name, identifier)
            return identifier

        delay = base_delay + random.uniform(0, base_delay)
        time.sleep(min(delay, max_delay))
        base_delay = min(base_delay * 2, max_delay)

    return None


def release_lock(name, identifier):
    lock_name = f"lock:{name}"
    logger.info("release_lock, lock_name=[%s], identifier=[%s]", lock_name, identifier)
    with redis_connection.pipeline() as pipe:
        while True:
            try:
                pipe.watch(lock_name)
                if pipe.get(lock_name) == identifier:
                    pipe.multi()
                    pipe.delete(lock_name)
                    pipe.execute()
                    logger.info("Lock released successfully, lock_name=[%s], identifier=[%s]", lock_name, identifier)
                    return True
                pipe.unwatch()
                logger.warning(
                    "Lock not owned by this identifier, lock_name=[%s], identifier=[%s]", lock_name, identifier
                )
                break
            except WatchError:
                logger.warning(
                    "WatchError occurred, retrying lock release, lock_name=[%s], identifier=[%s]",
                    lock_name,
                    identifier,
                )
            except Exception as e:
                logger.error("Error releasing lock: %s", str(e))
                break

        return False
