import functools

from flask_login import current_user
from flask_restful import abort
from funcy import flatten
from sqlalchemy import and_, or_, exists

view_only = True
not_view_only = False

ACCESS_TYPE_VIEW = "view"
ACCESS_TYPE_MODIFY = "modify"
ACCESS_TYPE_DELETE = "delete"

ACCESS_TYPES = (ACCESS_TYPE_VIEW, ACCESS_TYPE_MODIFY, ACCESS_TYPE_DELETE)


def has_access(obj, user, need_view_only):
    if hasattr(obj, "api_key") and user.is_api_user():
        return has_access_to_object(obj, user.id, need_view_only)
    else:
        return has_access_to_groups(obj, user, need_view_only)


def has_access_to_object(obj, api_key, need_view_only):
    if obj.api_key == api_key:
        return need_view_only
    elif hasattr(obj, "dashboard_api_keys"):
        # check if api_key belongs to a dashboard containing this query
        return api_key in obj.dashboard_api_keys and need_view_only
    else:
        return False


def has_access_to_groups(obj, user, need_view_only):
    groups = obj.groups if hasattr(obj, "groups") else obj

    if "admin" in user.permissions:
        return True

    matching_groups = set(groups.keys()).intersection(user.group_ids)

    if not matching_groups:
        return False

    required_level = 1 if need_view_only else 2

    group_level = 1 if all(flatten([groups[group] for group in matching_groups])) else 2

    return required_level <= group_level


def require_access(obj, user, need_view_only):
    if not has_access(obj, user, need_view_only):
        abort(403)


class require_permissions:
    def __init__(self, permissions, allow_one=False):
        self.permissions = permissions
        self.allow_one = allow_one

    def __call__(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            if self.allow_one:
                has_permissions = any([current_user.has_permission(permission) for permission in self.permissions])
            else:
                has_permissions = current_user.has_permissions(self.permissions)

            if has_permissions:
                return fn(*args, **kwargs)
            else:
                abort(403)

        return decorated


def require_permission(permission):
    return require_permissions((permission,))


def require_any_of_permission(permissions):
    return require_permissions(permissions, True)


def require_admin(fn):
    return require_permission("admin")(fn)


def require_super_admin(fn):
    return require_permission("super_admin")(fn)


def has_permission_or_owner(permission, object_owner_id):
    return int(object_owner_id) == current_user.id or current_user.has_permission(permission)


def is_admin_or_owner(object_owner_id):
    return has_permission_or_owner("admin", object_owner_id)


def require_permission_or_owner(permission, object_owner_id):
    if not has_permission_or_owner(permission, object_owner_id):
        abort(403)


def require_admin_or_owner(object_owner_id):
    if not is_admin_or_owner(object_owner_id):
        abort(403, message="You don't have permission to edit this resource.")


def can_modify(obj, user):
    return is_admin_or_owner(obj.user_id) or user.has_access(obj, ACCESS_TYPE_MODIFY)


def require_object_modify_permission(obj, user):
    if not can_modify(obj, user):
        abort(403)


# Object-level RBAC permission functions

def has_object_permission(obj, user, permission_type):
    """
    Check if user has specific permission on an object (Query or Dashboard).
    
    Args:
        obj: Query or Dashboard instance
        user: User instance
        permission_type: "create", "read", "update", or "delete"
    
    Returns:
        bool: True if user has permission
    """
    # Import here to avoid circular dependency
    from redash.models import ObjectPermission
    
    # Admin users have all permissions
    if "admin" in user.permissions:
        return True
    
    # If user has no groups, deny access
    if not user.group_ids:
        return False
    
    # Get object type name
    object_type = obj.__class__.__name__
    
    # First, check if ANY permissions exist for this object (from any group)
    # This is the key fix: we need to know if permissions have been set at all
    any_permissions_exist = ObjectPermission.query.filter(
        ObjectPermission.object_type == object_type,
        ObjectPermission.object_id == obj.id
    ).first() is not None
    
    # If no permissions exist at all for this object, allow access (backward compatibility)
    # This ensures existing queries/dashboards work without explicit permissions
    if not any_permissions_exist:
        return True
    
    # Permissions exist for this object, so check if user's groups have the required permission
    permissions = ObjectPermission.query.filter(
        ObjectPermission.object_type == object_type,
        ObjectPermission.object_id == obj.id,
        ObjectPermission.group_id.in_(user.group_ids)
    ).all()
    
    # Check if user's groups have explicit permission records
    if permissions:
        # User's groups have permission records, check if any grant the requested permission
        permission_field = f"can_{permission_type}"
        return any(getattr(perm, permission_field, False) for perm in permissions)
    
    # User's groups have NO permission records, but permissions exist for other groups
    # This means the user's groups were not granted access
    # Deny access (admin-only or restricted access)
    return False


def log_unauthorized_access(obj, user, permission_type):
    """
    Log an unauthorized access attempt to the audit log.
    
    Args:
        obj: Query or Dashboard instance
        user: User instance
        permission_type: "create", "read", "update", or "delete"
    """
    import time
    from redash.tasks.general import record_event
    
    # Get object type name
    object_type = obj.__class__.__name__
    
    # Determine the reason for denial
    reason = "no_permission"
    if "admin" in user.permissions:
        reason = "admin_override"  # Should not happen, but log it
    elif not user.group_ids:
        reason = "no_groups"
    else:
        # Check if any ObjectPermission records exist
        from redash.models import ObjectPermission
        permissions = ObjectPermission.query.filter(
            ObjectPermission.object_type == object_type,
            ObjectPermission.object_id == obj.id,
            ObjectPermission.group_id.in_(user.group_ids)
        ).first()
        
        if not permissions:
            reason = "no_permission_records"
        else:
            reason = "insufficient_permission"
    
    event_data = {
        "org_id": obj.org_id,
        "user_id": user.id,
        "action": "unauthorized_access",
        "object_type": object_type.lower(),
        "object_id": str(obj.id),
        "timestamp": int(time.time()),
        "attempted_action": permission_type,
        "reason": reason,
    }
    
    record_event.delay(event_data)


def require_object_permission(obj, user, permission_type):
    """
    Require user to have specific permission on an object, abort if not.
    
    Args:
        obj: Query or Dashboard instance
        user: User instance
        permission_type: "create", "read", "update", or "delete"
    
    Raises:
        403 if permission denied
    """
    if not has_object_permission(obj, user, permission_type):
        # Log unauthorized access attempt
        log_unauthorized_access(obj, user, permission_type)
        abort(403)


def filter_by_object_permissions(query, user, object_type, permission_type="read"):
    """
    Filter SQLAlchemy query to include only objects user has permission for.
    
    Args:
        query: SQLAlchemy query object
        user: User instance
        object_type: "Query" or "Dashboard"
        permission_type: Permission to check (default "read")
    
    Returns:
        Filtered SQLAlchemy query
    """
    # Import here to avoid circular dependency
    from redash.models import ObjectPermission
    
    # Admin users see everything
    if "admin" in user.permissions:
        return query
    
    # If user has no groups, return empty query
    if not user.group_ids:
        return query.filter(False)  # Returns empty result set
    
    # Get the model class
    if object_type == "Query":
        from redash.models import Query
        model_class = Query
    elif object_type == "Dashboard":
        from redash.models import Dashboard
        model_class = Dashboard
    else:
        raise ValueError(f"Unsupported object_type: {object_type}")
    
    # Build permission field name
    permission_field = f"can_{permission_type}"
    
    # Create a subquery to check if ANY permissions exist for each object
    # This is the key fix: we need to distinguish between "no permissions set" vs "user has no permission"
    has_any_permissions = exists().where(
        and_(
            ObjectPermission.object_type == object_type,
            ObjectPermission.object_id == model_class.id
        )
    )
    
    # Create a subquery to check if user's groups have the required permission
    user_has_permission = exists().where(
        and_(
            ObjectPermission.object_type == object_type,
            ObjectPermission.object_id == model_class.id,
            ObjectPermission.group_id.in_(user.group_ids),
            getattr(ObjectPermission, permission_field) == True  # noqa: E712
        )
    )
    
    # Create a subquery to check if user's groups have ANY permission record (even if denied)
    user_has_permission_record = exists().where(
        and_(
            ObjectPermission.object_type == object_type,
            ObjectPermission.object_id == model_class.id,
            ObjectPermission.group_id.in_(user.group_ids)
        )
    )
    
    # Create a subquery to check if ANY group has the permission granted
    # This is for backward compatibility when new groups are added
    any_group_has_permission = exists().where(
        and_(
            ObjectPermission.object_type == object_type,
            ObjectPermission.object_id == model_class.id,
            getattr(ObjectPermission, permission_field) == True  # noqa: E712
        )
    )
    
    # Filter logic:
    # 1. Include objects with no permissions set (backward compatibility for old queries)
    # 2. Include objects where user's groups have explicit permission granted
    query = query.filter(
        or_(
            ~has_any_permissions,  # No permissions set for this object (old queries)
            user_has_permission,   # User's groups have permission
        )
    )
    
    return query


def get_user_object_permissions(user, obj):
    """
    Get all permissions a user has on a specific object.
    
    Args:
        user: User instance
        obj: Query or Dashboard instance
    
    Returns:
        dict: Dictionary with can_create, can_read, can_update, can_delete flags
    """
    # Import here to avoid circular dependency
    from redash.models import ObjectPermission
    
    # Admin users have all permissions
    if "admin" in user.permissions:
        return {
            "can_create": True,
            "can_read": True,
            "can_update": True,
            "can_delete": True,
        }
    
    # If user has no groups, deny all permissions
    if not user.group_ids:
        return {
            "can_create": False,
            "can_read": False,
            "can_update": False,
            "can_delete": False,
        }
    
    # Get object type name
    object_type = obj.__class__.__name__
    
    # Get all permissions for this object from groups the user belongs to
    permissions = ObjectPermission.query.filter(
        ObjectPermission.object_type == object_type,
        ObjectPermission.object_id == obj.id,
        ObjectPermission.group_id.in_(user.group_ids)
    ).all()
    
    # If no permissions found, return all False
    if not permissions:
        return {
            "can_create": False,
            "can_read": False,
            "can_update": False,
            "can_delete": False,
        }
    
    # Union of all permissions from all groups
    return {
        "can_create": any(p.can_create for p in permissions),
        "can_read": any(p.can_read for p in permissions),
        "can_update": any(p.can_update for p in permissions),
        "can_delete": any(p.can_delete for p in permissions),
    }
