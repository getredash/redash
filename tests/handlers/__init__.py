import json
from contextlib import contextmanager

from tests.factories import user_factory
from redash.utils import json_dumps


@contextmanager
def authenticated_user(c, user=None):
    if not user:
        user = user_factory.create()

    with c.session_transaction() as sess:
        sess['user_id'] = user.id

    yield user


def json_request(method, path, data=None):
    if data:
        response = method(path, data=json_dumps(data))
    else:
        response = method(path)

    if response.data:
        response.json = json.loads(response.data)
    else:
        response.json = None

    return response
