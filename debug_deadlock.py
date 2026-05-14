#!/usr/bin/env python3
"""
Deadlock debugging utility for Redash tests

Usage:
  # Get the PID of the hanging test process
  ps aux | grep pytest

  # Send signal to dump stacks (if the process has our signal handler)
  python debug_deadlock.py <PID>
  
  # Or use kill directly:
  kill -USR1 <PID>  # Custom signal handler
  kill -USR2 <PID>  # faulthandler (if enabled)
"""

import os
import sys
import signal
import time
import psutil


def find_pytest_processes():
    """Find running pytest processes"""
    processes = []
    try:
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline = " ".join(proc.info["cmdline"] or [])
                if "pytest" in cmdline or "docker compose" in cmdline:
                    processes.append({"pid": proc.info["pid"], "name": proc.info["name"], "cmdline": cmdline})
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        print(f"Error finding processes: {e}")

    return processes


def send_debug_signal(pid, signal_num=signal.SIGUSR1):
    """Send debug signal to process"""
    try:
        print(f"Sending signal {signal_num} to process {pid}")
        os.kill(pid, signal_num)
        print("Signal sent successfully")
        return True
    except ProcessLookupError:
        print(f"Process {pid} not found")
        return False
    except PermissionError:
        print(f"Permission denied for process {pid}")
        return False
    except Exception as e:
        print(f"Error sending signal: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python debug_deadlock.py <PID> [signal_number]")
        print("\nFinding pytest processes:")

        processes = find_pytest_processes()
        if processes:
            for proc in processes:
                print(f"  PID {proc['pid']}: {proc['cmdline'][:100]}...")
        else:
            print("  No pytest processes found")

        print("\nExample:")
        print("  python debug_deadlock.py 12345")
        print("  python debug_deadlock.py 12345 10  # Send SIGUSR1")
        print("  python debug_deadlock.py 12345 12  # Send SIGUSR2")
        sys.exit(1)

    pid = int(sys.argv[1])
    signal_num = int(sys.argv[2]) if len(sys.argv) > 2 else signal.SIGUSR1

    success = send_debug_signal(pid, signal_num)

    if success:
        print("\nStack traces should appear in the test output.")
        print("If nothing appears, the process might not have signal handlers setup.")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
