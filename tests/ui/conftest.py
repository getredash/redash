# -*- coding: utf-8 -*-

"""Plugin for running UI tests."""

import socket

import pytest

from redash import (
    create_app,
    redis_connection,
)
from redash.models import db
from tests.factories import Factory
from tests.ui.live_server import LiveServer


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


def pytest_collection_modifyitems(items):
    """Add a 'ui' marker to all test items under 'ui/'.

    If you wish to only run UI tests add the '-m ui' CLI option. If you wish
    to exclude UI tests from your test run add the '-m not ui' CLI option.
    """
    for item in items:
        if item.fspath is not None and 'ui/' in str(item.fspath):
            item.add_marker(pytest.mark.ui)


def pytest_addoption(parser):
    """Add custom options to pytest."""
    group = parser.getgroup('ui')

    group.addoption(
        '--live-server-timeout',
        action='store',
        dest='live_server_timeout',
        default=5,
        type=float,
        help="timeout in seconds to wait for the live_server to start up.",
    )
