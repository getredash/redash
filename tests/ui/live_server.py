# -*- coding: utf-8 -*-

"""Live Server implementation for UI tests."""

import multiprocessing
import socket
import time


class LiveServer(object):
    """LiveServer context manager to run the Flask app."""

    def __init__(self, app, host='localhost', port=5000, timeout=5):
        """Initialize the LiveServer."""
        self.app = app
        self.host = host
        self.port = port
        self.timeout = timeout

        self._proc = None

    def __enter__(self):
        """Run the Flask app in a separate process."""
        self._proc = multiprocessing.Process(
            target=self.app.run,
            kwargs={
                'port': self.port,
                'use_reloader': False,
                'threaded': True,
            },
        )

        self._proc.daemon = True
        self._proc.start()

        start_time = time.time()

        while True:
            elapsed_time = time.time() - start_time

            if elapsed_time > self.timeout:
                msg = 'Failed to start LiveServer at {server.url}'
                raise RuntimeError(msg.format(server=self))

            if self.ping():
                break

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Terminate the process running the Flask app."""
        self._proc.terminate()
        self._proc.join()

        # Make sure to propagate exceptions
        return False

    def ping(self):
        """Open a socket and try to connect to the server."""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

        try:
            s.connect((self.host, self.port))
        except socket.error as e:
            success = False
        else:
            success = True
        finally:
            s.close()

        return success

    @property
    def url(self):
        """Return the URL to the LiveServer."""
        return 'http://{host}:{port}'.format(
            host=self.host,
            port=self.port,
        )

    def __str__(self):
        """Return the URL to the LiveServer."""
        return self.url

    def __add__(self, other):
        """Implement addition for LiveServer."""
        if not isinstance(other, str):
            msg = 'Require str to concatenate with LiveServer; got {}'
            raise TypeError(msg.format(type(other).__name__))

        return str(self) + other
