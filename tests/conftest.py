"""
Pytest configuration for deadlock detection
"""
import pytest
import logging
import sys
import os

# Add the project root to Python path to ensure imports work
sys.path.insert(0, "/app")

logger = logging.getLogger(__name__)

# Enable deadlock detection IMMEDIATELY when this module is imported
try:
    from tests.test_utils import enable_deadlock_detection, setup_faulthandler, setup_deadlock_signal_handler

    # Enable right now, don't wait for session start
    setup_faulthandler()
    setup_deadlock_signal_handler()

    logger.error("=== DEADLOCK DETECTION ACTIVATED EARLY ===")
    logger.error("Send SIGUSR1 for custom stack dump, SIGUSR2 for faulthandler dump")

    HAS_DEADLOCK_UTILS = True
except Exception as e:
    logger.error(f"Failed to enable deadlock detection: {e}")
    HAS_DEADLOCK_UTILS = False


def pytest_sessionstart(session):
    """
    Called after the Session object has been created
    """
    if HAS_DEADLOCK_UTILS:
        try:
            enable_deadlock_detection()
            logger.info("Deadlock detection enabled for test session")
        except Exception as e:
            logger.warning(f"Could not enable deadlock detection: {e}")
    else:
        logger.warning("Deadlock utilities not available")


def pytest_runtest_setup(item):
    """
    Called to perform the setup phase for a test item
    """
    # Log the test being run for easier debugging
    logger.info(f"Starting test: {item.nodeid}")


def pytest_runtest_teardown(item, nextitem):
    """
    Called to perform the teardown phase for a test item
    """
    # Log test completion
    logger.info(f"Completed test: {item.nodeid}")
