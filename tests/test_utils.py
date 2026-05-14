"""
Test utilities for detecting deadlocks and performance issues
"""
import logging
import os
import signal
import sys
import threading
import time
import traceback
from contextlib import contextmanager

try:
    import psutil
except ImportError:
    psutil = None

try:
    import faulthandler

    HAS_FAULTHANDLER = True
except ImportError:
    HAS_FAULTHANDLER = False

from redash.models import db

logger = logging.getLogger(__name__)


def enable_deadlock_detection():
    """
    Simple function to enable deadlock detection for the current process
    Call this at the start of your test session
    """
    setup_faulthandler()
    setup_deadlock_signal_handler()
    logger.info("Deadlock detection enabled")
    logger.info("Send SIGUSR1 for custom stack dump, SIGUSR2 for faulthandler dump")


def dump_all_thread_stacks():
    """
    Dump stack traces for all threads when a deadlock is suspected
    """
    logger.error("=== DEADLOCK DETECTED: Dumping all thread stacks ===")

    # Use faulthandler if available (best option)
    if HAS_FAULTHANDLER:
        logger.error("--- faulthandler stack dump ---")
        try:
            faulthandler.dump_traceback(file=sys.stderr)
        except Exception as e:
            logger.error(f"Failed to dump with faulthandler: {e}")

    # Manual thread stack dump
    logger.error("--- Manual thread stack dump ---")
    threads = dict(threading._active)
    for thread_id, thread_obj in threads.items():
        logger.error(f"Thread {thread_id} ({thread_obj.name}):")

        # Get the frame for this thread
        frame = sys._current_frames().get(thread_id)
        if frame:
            stack = traceback.format_stack(frame)
            for line in stack:
                logger.error(f"  {line.strip()}")
        else:
            logger.error("  No frame available")
        logger.error("-" * 50)


def setup_deadlock_signal_handler():
    """
    Setup signal handler to dump stacks on SIGUSR1
    """

    def signal_handler(signum, frame):
        logger.error(f"=== RECEIVED SIGNAL {signum} - DUMPING THREAD STACKS ===")
        print(f"=== SIGNAL {signum} RECEIVED - DUMPING STACKS ===", file=sys.stderr)
        sys.stderr.flush()
        dump_all_thread_stacks()

        # Also try to print directly to stderr
        print("=== DIRECT STDERR STACK DUMP ===", file=sys.stderr)
        traceback.print_stack(file=sys.stderr)
        sys.stderr.flush()

    try:
        signal.signal(signal.SIGUSR1, signal_handler)
        signal.signal(signal.SIGUSR2, signal_handler)  # Also handle USR2
        logger.error("=== SIGNAL HANDLERS REGISTERED FOR SIGUSR1 AND SIGUSR2 ===")
        print("=== SIGNAL HANDLERS ACTIVE - PID:", os.getpid(), "===", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        logger.error(f"Could not setup signal handler: {e}")
        print(f"Signal handler error: {e}", file=sys.stderr)


def setup_faulthandler():
    """
    Setup faulthandler to dump on segfaults and deadlocks
    """
    if HAS_FAULTHANDLER:
        try:
            # Enable faulthandler to dump on SIGSEGV, SIGFPE, SIGABRT, SIGBUS, SIGILL
            faulthandler.enable(file=sys.stderr, all_threads=True)

            # Register for SIGUSR2 to dump all threads manually
            faulthandler.register(signal.SIGUSR2, file=sys.stderr, all_threads=True)

            logger.error("=== FAULTHANDLER ENABLED ===")
            print(f"=== FAULTHANDLER ACTIVE - PID {os.getpid()} ===", file=sys.stderr)
            sys.stderr.flush()
            return True
        except Exception as e:
            logger.error(f"Could not enable faulthandler: {e}")
            print(f"Faulthandler error: {e}", file=sys.stderr)
            return False
    else:
        logger.error("faulthandler not available")
        print("faulthandler module not available", file=sys.stderr)
        return False


@contextmanager
def deadlock_monitor(timeout=30):
    """
    Context manager to monitor for deadlocks during test execution with stack traces
    """
    start_time = time.time()
    monitor_thread = None

    # Setup deadlock detection tools
    setup_faulthandler()
    setup_deadlock_signal_handler()

    def check_deadlocks():
        """Check for database deadlocks and long-running queries"""
        try:
            # Query PostgreSQL for deadlocks and blocking queries
            deadlock_query = """
            SELECT 
                blocked_locks.pid AS blocked_pid,
                blocked_activity.usename AS blocked_user,
                blocking_locks.pid AS blocking_pid,
                blocking_activity.usename AS blocking_user,
                blocked_activity.query AS blocked_statement,
                blocking_activity.query AS blocking_statement,
                blocked_activity.application_name AS blocked_app,
                blocking_activity.application_name AS blocking_app
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity 
                ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity 
                ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted;
            """

            result = db.session.execute(deadlock_query).fetchall()
            if result:
                logger.error("DATABASE DEADLOCK DETECTED:")
                for row in result:
                    logger.error(f"  Blocked PID: {row[0]} by PID: {row[2]}")
                    logger.error(f"  Blocked Query: {row[4]}")
                    logger.error(f"  Blocking Query: {row[5]}")

                # Dump all thread stacks when deadlock is detected
                dump_all_thread_stacks()
                return True
        except Exception as e:
            logger.warning(f"Error checking deadlocks: {e}")
        return False

    def monitor_loop():
        """Monitor for deadlocks in a separate thread"""
        while True:
            if time.time() - start_time > timeout:
                logger.error(f"TEST TIMEOUT after {timeout}s - possible deadlock")
                dump_all_thread_stacks()
                break

            if check_deadlocks():
                logger.error("Database deadlock detected during test execution")
                break

            time.sleep(1)

    try:
        # Start monitoring thread
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()

        yield

    finally:
        if monitor_thread and monitor_thread.is_alive():
            # Thread will exit when test completes
            pass


def check_postgresql_connections():
    """Check for hanging PostgreSQL connections"""
    try:
        connection_query = """
        SELECT 
            pid,
            application_name,
            state,
            query_start,
            state_change,
            query
        FROM pg_stat_activity 
        WHERE application_name LIKE '%test%'
        AND state != 'idle'
        ORDER BY query_start;
        """

        result = db.session.execute(connection_query).fetchall()
        if result:
            logger.info("Active test connections:")
            for row in result:
                logger.info(f"  PID: {row[0]}, State: {row[2]}, Query: {row[5][:100]}...")
        return result
    except Exception as e:
        logger.error(f"Error checking connections: {e}")
        return []


def check_system_resources():
    """Check system resource usage"""
    if not psutil:
        logger.info("psutil not available, skipping system resource check")
        return {}

    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memory usage
        memory = psutil.virtual_memory()

        # Disk usage
        disk = psutil.disk_usage("/")

        logger.info(f"System Resources - CPU: {cpu_percent}%, Memory: {memory.percent}%, Disk: {disk.percent}%")

        if cpu_percent > 90:
            logger.warning("High CPU usage detected")
        if memory.percent > 90:
            logger.warning("High memory usage detected")

        return {"cpu": cpu_percent, "memory": memory.percent, "disk": disk.percent}
    except Exception as e:
        logger.error(f"Error checking system resources: {e}")
        return {}


def kill_hanging_connections():
    """Kill hanging database connections from tests"""
    try:
        kill_query = """
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE application_name LIKE '%test%'
        AND state != 'idle'
        AND query_start < NOW() - INTERVAL '30 seconds';
        """

        result = db.session.execute(kill_query).fetchall()
        killed_count = len([r for r in result if r[0]])

        if killed_count > 0:
            logger.info(f"Killed {killed_count} hanging test connections")

        return killed_count
    except Exception as e:
        logger.error(f"Error killing connections: {e}")
        return 0
