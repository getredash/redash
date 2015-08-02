import functools
from flask.ext.login import current_user
from flask.ext.restful import abort


class require_permissions(object):
    def __init__(self, permissions):
        self.permissions = permissions

    def __call__(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            has_permissions = current_user.has_permissions(self.permissions)

            if has_permissions:
                return fn(*args, **kwargs)
            else:
                abort(403)

        return decorated


def require_permission(permission):
    return require_permissions((permission,))


def require_admin_or_owner(object_owner_id):
    if not (int(object_owner_id) == current_user.id or current_user.has_permission('admin')):
        abort(403)