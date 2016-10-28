import json
from contextlib import contextmanager

from tests.factories import user_factory
from redash.utils import json_dumps
from redash.wsgi import app

app.config['TESTING'] = True


def authenticate_request(c, user):
    with c.session_transaction() as sess:
        sess['user_id'] = user.id


@contextmanager
def authenticated_user(c, user=None):
    if not user:
        user = user_factory.create()

    authenticate_request(c, user)

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
    with app.test_client() as c:
        if user:
            authenticate_request(c, user)

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


def get_request(path, org=None):
    if org:
        path = "/{}{}".format(org.slug, path)

    with app.test_client() as c:
        return c.get(path)


def post_request(path, data=None, org=None):
    if org:
        path = "/{}{}".format(org.slug, path)

    with app.test_client() as c:
        return c.post(path, data=data)
