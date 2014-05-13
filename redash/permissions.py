import functools
from flask.ext.login import current_user
from flask.ext.restful import abort


class require_permissions(object):
    def __init__(self, permissions):
        self.permissions = permissions

    def __call__(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            has_permissions = reduce(lambda a, b: a and b,
                                      map(lambda permission: permission in current_user.permissions,
                                          self.permissions),
                                      True)

            if has_permissions:
                return fn(*args, **kwargs)
            else:
                abort(403)

        return decorated


def require_permission(permission):
    return require_permissions((permission,))