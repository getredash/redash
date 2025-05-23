from flask import request
from flask_restful import abort

from redash import models
from redash.handlers.base import BaseResource
from redash.permissions import require_admin_or_owner, require_permission


class DashboardPermissionListResource(BaseResource):
    @require_permission("admin")
    def get(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        permissions = models.AccessPermission.find(dashboard)
        
        return [
            {
                "id": p.id,
                "user": models.User.get_by_id(p.grantee_id).to_dict(),
                "access_type": p.access_type,
                "grantor": models.User.get_by_id(p.grantor_id).to_dict()
            }
            for p in permissions
        ]

    @require_permission("admin")  
    def post(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        req = request.get_json(force=True)
        
        user_id = req.get("user_id")
        access_type = req.get("access_type", "view")
        
        if not user_id:
            abort(400, message="user_id is required")
        
        try:
            user = models.User.get_by_id(user_id)
            if user.org_id != self.current_org.id:
                abort(400, message="User not found in organization")
        except:
            abort(400, message="User not found")
        
        if not user.is_dashboard_only_user():
            abort(400, message="Can only grant dashboard permissions to dashboard-only users")
        
        permission = models.AccessPermission.grant(
            dashboard, 
            access_type, 
            user, 
            self.current_user
        )
        models.db.session.commit()
        
        return {
            "id": permission.id,
            "user": user.to_dict(),
            "access_type": access_type,
            "grantor": self.current_user.to_dict()
        }


class DashboardPermissionResource(BaseResource):
    @require_permission("admin")
    def delete(self, dashboard_id, permission_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        permission = models.AccessPermission.query.filter(
            models.AccessPermission.id == permission_id,
            models.AccessPermission.object_type == "dashboards",
            models.AccessPermission.object_id == dashboard.id
        ).first()
        
        if not permission:
            abort(404, message="Permission not found")
        
        models.db.session.delete(permission)
        models.db.session.commit()
        
        return {"message": "Permission revoked"} 