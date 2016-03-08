import json
from contextlib import contextmanager

from tests.factories import user_factory
from redash.utils import json_dumps
from redash.wsgi import app


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


def make_request(method, path, user, data=None, is_json=True):
    with app.test_client() as c, authenticated_user(c, user=user):
        method_fn = getattr(c, method.lower())
        headers = {}

        if data and is_json:
            data = json_dumps(data)

        if is_json:
            content_type = 'application/json'
        else:
            content_type = None

        response = method_fn(path, data=data, headers=headers, content_type=content_type)

        if response.data and is_json:
            response.json = json.loads(response.data)

        return response
