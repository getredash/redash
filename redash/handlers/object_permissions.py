"""
API handlers for managing object-level permissions (RBAC).
"""
from flask import request
from flask_restful import abort

from redash import models
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import require_admin, require_object_permission


class QueryPermissionsResource(BaseResource):
    def get(self, query_id):
        """
        Get permissions for a query.
        
        :param query_id: ID of query
        
        Returns list of groups with their CRUD permissions for this query.
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        
        # User must have read permission to view permissions
        require_object_permission(query, self.current_user, "read")
        
        # Get all groups in the organization
        groups = models.Group.all(self.current_org)
        
        # Get all permissions for this query
        permissions = models.ObjectPermission.query.filter(
            models.ObjectPermission.object_type == "Query",
            models.ObjectPermission.object_id == query_id,
            models.ObjectPermission.org_id == self.current_org.id
        ).all()
        
        # Create a mapping of group_id to permissions
        perm_map = {p.group_id: p for p in permissions}
        
        # Build response with all groups
        result = []
        for group in groups:
            perm = perm_map.get(group.id)
            result.append({
                "group_id": group.id,
                "group_name": group.name,
                "can_create": perm.can_create if perm else False,
                "can_read": perm.can_read if perm else False,
                "can_update": perm.can_update if perm else False,
                "can_delete": perm.can_delete if perm else False,
            })
        
        self.record_event({
            "action": "view_permissions",
            "object_id": query_id,
            "object_type": "query"
        })
        
        return {"permissions": result}
    
    def post(self, query_id):
        """
        Update permissions for a query.
        
        :param query_id: ID of query
        :<json list permissions: List of permission objects with group_id and CRUD flags
        
        Updates the permissions for the query.
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        
        # User must have update permission to modify permissions
        require_object_permission(query, self.current_user, "update")
        
        data = request.get_json(force=True)
        permissions_data = data.get("permissions", [])
        
        # Validate input
        if not isinstance(permissions_data, list):
            abort(400, message="permissions must be a list")
        
        # Validate each permission entry
        for perm_data in permissions_data:
            if not isinstance(perm_data, dict):
                abort(400, message="Each permission must be an object")
            
            if "group_id" not in perm_data:
                abort(400, message="group_id is required")
            
            # Verify group exists and belongs to this org
            group = models.Group.query.filter(
                models.Group.id == perm_data["group_id"],
                models.Group.org_id == self.current_org.id
            ).first()
            
            if not group:
                abort(400, message=f"Group {perm_data['group_id']} not found")
        
        # Update permissions
        for perm_data in permissions_data:
            group_id = perm_data["group_id"]
            
            # Find existing permission or create new one
            perm = models.ObjectPermission.query.filter(
                models.ObjectPermission.object_type == "Query",
                models.ObjectPermission.object_id == query_id,
                models.ObjectPermission.group_id == group_id,
                models.ObjectPermission.org_id == self.current_org.id
            ).first()
            
            is_new = perm is None
            old_values = None
            
            if not perm:
                perm = models.ObjectPermission(
                    org_id=self.current_org.id,
                    group_id=group_id,
                    object_type="Query",
                    object_id=query_id
                )
                models.db.session.add(perm)
            else:
                # Store old values for audit log
                old_values = {
                    "can_create": perm.can_create,
                    "can_read": perm.can_read,
                    "can_update": perm.can_update,
                    "can_delete": perm.can_delete,
                }
            
            # Update permission flags
            perm.can_create = perm_data.get("can_create", False)
            perm.can_read = perm_data.get("can_read", False)
            perm.can_update = perm_data.get("can_update", False)
            perm.can_delete = perm_data.get("can_delete", False)
            
            # Flush to get the ID for new permissions
            models.db.session.flush()
            
            # Log the permission change
            action = "create" if is_new else "update"
            models.ObjectPermission.log_permission_change(
                perm, self.current_user.id, action, old_values
            )
        
        models.db.session.commit()
        
        self.record_event({
            "action": "update_permissions",
            "object_id": query_id,
            "object_type": "query"
        })
        
        return {"message": "Permissions updated successfully"}


class DashboardPermissionsResource(BaseResource):
    def get(self, dashboard_id):
        """
        Get permissions for a dashboard.
        
        :param dashboard_id: ID of dashboard
        
        Returns list of groups with their CRUD permissions for this dashboard.
        """
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_id, self.current_org)
        
        # User must have read permission to view permissions
        require_object_permission(dashboard, self.current_user, "read")
        
        # Get all groups in the organization
        groups = models.Group.all(self.current_org)
        
        # Get all permissions for this dashboard
        permissions = models.ObjectPermission.query.filter(
            models.ObjectPermission.object_type == "Dashboard",
            models.ObjectPermission.object_id == dashboard_id,
            models.ObjectPermission.org_id == self.current_org.id
        ).all()
        
        # Create a mapping of group_id to permissions
        perm_map = {p.group_id: p for p in permissions}
        
        # Build response with all groups
        result = []
        for group in groups:
            perm = perm_map.get(group.id)
            result.append({
                "group_id": group.id,
                "group_name": group.name,
                "can_create": perm.can_create if perm else False,
                "can_read": perm.can_read if perm else False,
                "can_update": perm.can_update if perm else False,
                "can_delete": perm.can_delete if perm else False,
            })
        
        self.record_event({
            "action": "view_permissions",
            "object_id": dashboard_id,
            "object_type": "dashboard"
        })
        
        return {"permissions": result}
    
    def post(self, dashboard_id):
        """
        Update permissions for a dashboard.
        
        :param dashboard_id: ID of dashboard
        :<json list permissions: List of permission objects with group_id and CRUD flags
        
        Updates the permissions for the dashboard.
        """
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_id, self.current_org)
        
        # User must have update permission to modify permissions
        require_object_permission(dashboard, self.current_user, "update")
        
        data = request.get_json(force=True)
        permissions_data = data.get("permissions", [])
        
        # Validate input
        if not isinstance(permissions_data, list):
            abort(400, message="permissions must be a list")
        
        # Validate each permission entry
        for perm_data in permissions_data:
            if not isinstance(perm_data, dict):
                abort(400, message="Each permission must be an object")
            
            if "group_id" not in perm_data:
                abort(400, message="group_id is required")
            
            # Verify group exists and belongs to this org
            group = models.Group.query.filter(
                models.Group.id == perm_data["group_id"],
                models.Group.org_id == self.current_org.id
            ).first()
            
            if not group:
                abort(400, message=f"Group {perm_data['group_id']} not found")
        
        # Update permissions
        for perm_data in permissions_data:
            group_id = perm_data["group_id"]
            
            # Find existing permission or create new one
            perm = models.ObjectPermission.query.filter(
                models.ObjectPermission.object_type == "Dashboard",
                models.ObjectPermission.object_id == dashboard_id,
                models.ObjectPermission.group_id == group_id,
                models.ObjectPermission.org_id == self.current_org.id
            ).first()
            
            is_new = perm is None
            old_values = None
            
            if not perm:
                perm = models.ObjectPermission(
                    org_id=self.current_org.id,
                    group_id=group_id,
                    object_type="Dashboard",
                    object_id=dashboard_id
                )
                models.db.session.add(perm)
            else:
                # Store old values for audit log
                old_values = {
                    "can_create": perm.can_create,
                    "can_read": perm.can_read,
                    "can_update": perm.can_update,
                    "can_delete": perm.can_delete,
                }
            
            # Update permission flags
            perm.can_create = perm_data.get("can_create", False)
            perm.can_read = perm_data.get("can_read", False)
            perm.can_update = perm_data.get("can_update", False)
            perm.can_delete = perm_data.get("can_delete", False)
            
            # Flush to get the ID for new permissions
            models.db.session.flush()
            
            # Log the permission change
            action = "create" if is_new else "update"
            models.ObjectPermission.log_permission_change(
                perm, self.current_user.id, action, old_values
            )
        
        models.db.session.commit()
        
        self.record_event({
            "action": "update_permissions",
            "object_id": dashboard_id,
            "object_type": "dashboard"
        })
        
        return {"message": "Permissions updated successfully"}


class GroupObjectPermissionsResource(BaseResource):
    @require_admin
    def get(self, group_id):
        """
        Get all object permissions for a group.
        
        :param group_id: ID of group
        
        Returns list of ALL published (non-draft) queries and dashboards with their permissions for this group.
        If no permission record exists, returns default values (all false).
        """
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)
        
        # Get all permissions for this group
        permissions = models.ObjectPermission.query.filter(
            models.ObjectPermission.group_id == group_id,
            models.ObjectPermission.org_id == self.current_org.id
        ).all()
        
        # Create permission maps for quick lookup
        query_perms = {}
        dashboard_perms = {}
        
        for perm in permissions:
            perm_dict = {
                "can_create": perm.can_create,
                "can_read": perm.can_read,
                "can_update": perm.can_update,
                "can_delete": perm.can_delete,
            }
            
            if perm.object_type == "Query":
                query_perms[perm.object_id] = perm_dict
            elif perm.object_type == "Dashboard":
                dashboard_perms[perm.object_id] = perm_dict
        
        # Get ALL published (non-draft) queries in the organization (not archived)
        all_queries = models.Query.query.filter(
            models.Query.org_id == self.current_org.id,
            models.Query.is_archived == False,
            models.Query.is_draft == False  # Only published queries
        ).order_by(models.Query.name).all()
        
        # Get ALL published (non-draft) dashboards in the organization (not archived)
        all_dashboards = models.Dashboard.query.filter(
            models.Dashboard.org_id == self.current_org.id,
            models.Dashboard.is_archived == False,
            models.Dashboard.is_draft == False  # Only published dashboards
        ).order_by(models.Dashboard.name).all()
        
        # Build response with all objects
        result = {
            "queries": [],
            "dashboards": []
        }
        
        for query in all_queries:
            perm = query_perms.get(query.id, {
                "can_create": False,
                "can_read": False,
                "can_update": False,
                "can_delete": False,
            })
            result["queries"].append({
                "object_id": query.id,
                "name": query.name,
                "can_create": perm["can_create"],
                "can_read": perm["can_read"],
                "can_update": perm["can_update"],
                "can_delete": perm["can_delete"],
            })
        
        for dashboard in all_dashboards:
            perm = dashboard_perms.get(dashboard.id, {
                "can_create": False,
                "can_read": False,
                "can_update": False,
                "can_delete": False,
            })
            result["dashboards"].append({
                "object_id": dashboard.id,
                "name": dashboard.name,
                "can_create": perm["can_create"],
                "can_read": perm["can_read"],
                "can_update": perm["can_update"],
                "can_delete": perm["can_delete"],
            })
        
        self.record_event({
            "action": "view_object_permissions",
            "object_id": group_id,
            "object_type": "group"
        })
        
        return result
    
    @require_admin
    def post(self, group_id):
        """
        Bulk update object permissions for a group.
        
        :param group_id: ID of group
        :<json list queries: List of query permission objects
        :<json list dashboards: List of dashboard permission objects
        
        Updates permissions for multiple objects at once.
        """
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)
        
        data = request.get_json(force=True)
        queries_data = data.get("queries", [])
        dashboards_data = data.get("dashboards", [])
        
        # Validate input
        if not isinstance(queries_data, list):
            abort(400, message="queries must be a list")
        if not isinstance(dashboards_data, list):
            abort(400, message="dashboards must be a list")
        
        # Process query permissions
        for query_data in queries_data:
            if not isinstance(query_data, dict):
                abort(400, message="Each query permission must be an object")
            
            if "object_id" not in query_data:
                abort(400, message="object_id is required")
            
            object_id = query_data["object_id"]
            
            # Verify query exists and belongs to this org
            query = models.Query.query.filter(
                models.Query.id == object_id,
                models.Query.org_id == self.current_org.id
            ).first()
            
            if not query:
                abort(400, message=f"Query {object_id} not found")
            
            # Find existing permission or create new one
            perm = models.ObjectPermission.query.filter(
                models.ObjectPermission.object_type == "Query",
                models.ObjectPermission.object_id == object_id,
                models.ObjectPermission.group_id == group_id,
                models.ObjectPermission.org_id == self.current_org.id
            ).first()
            
            is_new = perm is None
            old_values = None
            
            if not perm:
                perm = models.ObjectPermission(
                    org_id=self.current_org.id,
                    group_id=group_id,
                    object_type="Query",
                    object_id=object_id
                )
                models.db.session.add(perm)
            else:
                # Store old values for audit log
                old_values = {
                    "can_create": perm.can_create,
                    "can_read": perm.can_read,
                    "can_update": perm.can_update,
                    "can_delete": perm.can_delete,
                }
            
            # Update permission flags
            perm.can_create = query_data.get("can_create", False)
            perm.can_read = query_data.get("can_read", False)
            perm.can_update = query_data.get("can_update", False)
            perm.can_delete = query_data.get("can_delete", False)
            
            # Flush to get the ID for new permissions
            models.db.session.flush()
            
            # Log the permission change
            action = "create" if is_new else "update"
            models.ObjectPermission.log_permission_change(
                perm, self.current_user.id, action, old_values
            )
        
        # Process dashboard permissions
        for dashboard_data in dashboards_data:
            if not isinstance(dashboard_data, dict):
                abort(400, message="Each dashboard permission must be an object")
            
            if "object_id" not in dashboard_data:
                abort(400, message="object_id is required")
            
            object_id = dashboard_data["object_id"]
            
            # Verify dashboard exists and belongs to this org
            dashboard = models.Dashboard.query.filter(
                models.Dashboard.id == object_id,
                models.Dashboard.org_id == self.current_org.id
            ).first()
            
            if not dashboard:
                abort(400, message=f"Dashboard {object_id} not found")
            
            # Find existing permission or create new one
            perm = models.ObjectPermission.query.filter(
                models.ObjectPermission.object_type == "Dashboard",
                models.ObjectPermission.object_id == object_id,
                models.ObjectPermission.group_id == group_id,
                models.ObjectPermission.org_id == self.current_org.id
            ).first()
            
            is_new = perm is None
            old_values = None
            
            if not perm:
                perm = models.ObjectPermission(
                    org_id=self.current_org.id,
                    group_id=group_id,
                    object_type="Dashboard",
                    object_id=object_id
                )
                models.db.session.add(perm)
            else:
                # Store old values for audit log
                old_values = {
                    "can_create": perm.can_create,
                    "can_read": perm.can_read,
                    "can_update": perm.can_update,
                    "can_delete": perm.can_delete,
                }
            
            # Update permission flags
            perm.can_create = dashboard_data.get("can_create", False)
            perm.can_read = dashboard_data.get("can_read", False)
            perm.can_update = dashboard_data.get("can_update", False)
            perm.can_delete = dashboard_data.get("can_delete", False)
            
            # Flush to get the ID for new permissions
            models.db.session.flush()
            
            # Log the permission change
            action = "create" if is_new else "update"
            models.ObjectPermission.log_permission_change(
                perm, self.current_user.id, action, old_values
            )
        
        models.db.session.commit()
        
        self.record_event({
            "action": "bulk_update_object_permissions",
            "object_id": group_id,
            "object_type": "group"
        })
        
        return {"message": "Permissions updated successfully"}
