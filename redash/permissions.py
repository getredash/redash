import functools
import itertools
import models
from flask.ext.login import current_user
from flask.ext.restful import abort


class require_permissions(object):
    def __init__(self, permissions):
        self.permissions = permissions

    def __call__(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            permissions = list(itertools.chain(*[g.permissions for g in models.Group.select().where(models.Group.name << current_user.groups)]))
            
            has_permissions = reduce(lambda a, b: a and b,
                                      map(lambda permission: permission in permissions,
                                          self.permissions),
                                      True)

            if has_permissions:
                return fn(*args, **kwargs)
            else:
                abort(403)

        return decorated


def require_permission(permission):
    return require_permissions((permission,))