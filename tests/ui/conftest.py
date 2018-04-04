# -*- coding: utf-8 -*-

"""Plugin for running UI tests."""

import multiprocessing
import time
import socket

import pytest

from redash import (
    create_app,
    redis_connection,
)
from redash.models import db
from tests.factories import Factory


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


@pytest.fixture(name='host')
def fixture_host():
    """Return a host name as str."""
    return 'localhost'


@pytest.fixture(name='port')
def fixture_port():
    """Return a free port as int."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port


@pytest.fixture(name='app')
def fixture_app(host, port):
    """Run setup and teardown code for the Flask app."""
    app = create_app('testing')

    app.config['TESTING'] = True
    app.config['SERVER_NAME'] = '{host}:{port}'.format(host=host, port=port)

    app_ctx = app.app_context()
    app_ctx.push()

    db.session.close()
    db.drop_all()
    db.create_all()

    yield app

    db.session.remove()
    db.get_engine(app).dispose()

    app_ctx.pop()

    redis_connection.flushdb()


@pytest.fixture(name='live_server')
def fixture_live_server(request, app, host, port):
    """Return the LiveServer instance running the Flask app."""
    config = {
        'host': host,
        'port': port,
        'timeout': request.config.getoption('live_server_timeout'),
    }

    with LiveServer(app, **config) as live_server:
        yield live_server


@pytest.fixture(name='factory')
def fixture_factory(app):
    """Return a Factory instance."""
    return Factory()


@pytest.fixture(name='create_user')
def fixture_create_user(factory):
    """Return a function to create a user with password."""
    def create(password=None, **kwargs):
        """Create a user with password."""
        user = factory.create_user(**kwargs)

        if password is not None:
            user.hash_password(password)
            db.session.commit()

        return user

    return create


@pytest.fixture(name='user_password')
def fixture_user_password():
    """Return a password str."""
    return 'a#12B%@c3D'


@pytest.fixture(name='user_name')
def fixture_user_name():
    """Return a name str."""
    return 'Ashley McTest'


@pytest.fixture(name='user_email')
def fixture_user_email():
    """Return an email address str."""
    return 'ashley@example.com'


@pytest.fixture(name='user')
def fixture_user(create_user, user_name, user_email, user_password):
    """Return a user with a password."""
    return create_user(
        name=user_name,
        email=user_email,
        password=user_password,
    )


def pytest_addoption(parser):
    """Add custom options to pytest."""
    group = parser.getgroup('flask')

    group.addoption(
        '--live-server-timeout',
        action='store',
        dest='live_server_timeout',
        default=5,
        type=float,
        help="timeout in seconds to wait for the live_server to start up.",
    )
