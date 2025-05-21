import pytest
from redash import models
from redash.models.users import Group
from redash.permissions import ACCESS_TYPE_VIEW, ACCESS_TYPE_MODIFY

from tests import BaseTestCase # Assuming a common base class for tests
from tests.factories import (
    UserFactory,
    GroupFactory,
    DashboardFactory,
    QueryFactory,
    AlertFactory,
    DataSourceFactory,
    VisualizationFactory,
    WidgetFactory,
)

class TestDashboardOnlyViewerRole(BaseTestCase):
    def setUp(self):
        super().setUp()
        # Create the Dashboard Viewer Group Type if it doesn't exist (idempotent)
        # In a real setup, this might be part of migrations or initial data.
        # For testing, ensure it's there.
        self.dashboard_viewer_group_type = Group.DASHBOARD_VIEWER_GROUP 
        self.dashboard_viewer_permissions = Group.DASHBOARD_VIEWER_PERMISSIONS

        self.dashboard_viewer_group = GroupFactory.create(
            name="Dashboard Viewers Test Group",
            type=self.dashboard_viewer_group_type,
            permissions=self.dashboard_viewer_permissions,
            org=self.factory.org
        )
        self.dashboard_viewer_user = UserFactory.create(
            org=self.factory.org,
            group_ids=[self.dashboard_viewer_group.id]
        )
        # print(f"Dashboard Viewer User ID: {self.dashboard_viewer_user.id}, Group IDs: {self.dashboard_viewer_user.group_ids}")
        # print(f"Dashboard Viewer Group ID: {self.dashboard_viewer_group.id}, Permissions: {self.dashboard_viewer_group.permissions}, Type: {self.dashboard_viewer_group.type}")


    def test_dashboard_viewer_group_setup_correctly(self):
        """Test that the dashboard viewer group and user are set up with correct permissions."""
        group = models.Group.query.get(self.dashboard_viewer_group.id)
        self.assertEqual(group.type, self.dashboard_viewer_group_type)
        self.assertListEqual(sorted(group.permissions), sorted(self.dashboard_viewer_permissions))
        
        user = models.User.query.get(self.dashboard_viewer_user.id)
        # Check effective permissions - user.permissions should reflect only those from DASHBOARD_VIEWER_GROUP
        # The user.permissions property aggregates permissions from all their groups.
        # Since this user is only in dashboard_viewer_group, it should be the same.
        self.assertListEqual(sorted(user.permissions), sorted(self.dashboard_viewer_permissions))
        self.assertTrue(user.has_permission("list_dashboards"))
        self.assertFalse(user.has_permission("view_query"))
        self.assertFalse(user.has_permission("edit_dashboard"))
        self.assertFalse(user.has_permission("admin"))

    def test_dashboard_viewer_cannot_access_queries_api(self):
        """Dashboard viewer should get 403 for queries API."""
        # Test listing queries
        response = self.make_request(
            "get", "/api/queries", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 403)

        # Test accessing a specific query
        query = QueryFactory.create(user=self.factory.user, data_source=self.factory.data_source)
        response = self.make_request(
            "get", f"/api/queries/{query.id}", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 403)

    def test_dashboard_viewer_cannot_access_alerts_api(self):
        """Dashboard viewer should get 403 for alerts API."""
        # Test listing alerts
        response = self.make_request(
            "get", "/api/alerts", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 403)

        # Test accessing a specific alert
        query = QueryFactory.create(user=self.factory.user, data_source=self.factory.data_source)
        alert = AlertFactory.create(query_rel=query, user=self.factory.user)
        response = self.make_request(
            "get", f"/api/alerts/{alert.id}", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 403)

    def test_dashboard_viewer_sees_only_shared_dashboards_in_list(self):
        """Dashboard viewer should only see explicitly shared dashboards in the list."""
        # Dashboard A - not shared
        DashboardFactory.create(user=self.factory.user, org=self.factory.org, is_draft=False)
        
        # Dashboard B - shared with dashboard_viewer_group
        dashboard_b = DashboardFactory.create(user=self.factory.user, org=self.factory.org, is_draft=False)
        dashboard_b.group_access_permissions = {
            str(self.dashboard_viewer_group.id): ACCESS_TYPE_VIEW 
        }
        models.db.session.add(dashboard_b)
        models.db.session.commit()

        response = self.make_request(
            "get", "/api/dashboards", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json["results"]
        
        self.assertEqual(len(response_data), 1)
        self.assertEqual(response_data[0]["id"], dashboard_b.id)

    def test_dashboard_viewer_restricted_view_of_shared_dashboard(self):
        """Dashboard viewer should get a restricted view of a shared dashboard."""
        dashboard_shared = DashboardFactory.create(user=self.factory.user, org=self.factory.org, is_draft=False)
        
        # Create a query, visualization, and widget for this dashboard
        query = QueryFactory.create(user=self.factory.user, data_source=self.factory.data_source)
        vis = VisualizationFactory.create(query_rel=query)
        widget = WidgetFactory.create(dashboard=dashboard_shared, visualization=vis)
        models.db.session.add_all([vis, widget])

        dashboard_shared.group_access_permissions = {
            str(self.dashboard_viewer_group.id): ACCESS_TYPE_VIEW
        }
        models.db.session.add(dashboard_shared)
        models.db.session.commit()

        response = self.make_request(
            "get", f"/api/dashboards/{dashboard_shared.id}", user=self.dashboard_viewer_user
        )
        self.assertEqual(response.status_code, 200)
        dashboard_data = response.json
        
        self.assertFalse(dashboard_data["can_edit"])
        
        # Check widget serialization for restricted query info
        self.assertTrue(len(dashboard_data["widgets"]) > 0)
        widget_data = dashboard_data["widgets"][0] # Assuming one widget for simplicity
        
        self.assertIsNotNone(widget_data.get("visualization"))
        self.assertIsNotNone(widget_data["visualization"].get("query"))
        
        # Query 'id' should be missing for dashboard viewers due to serializer changes
        self.assertNotIn("id", widget_data["visualization"]["query"])
        # Query 'name', 'description', 'options' should still be there
        self.assertIn("name", widget_data["visualization"]["query"])
        self.assertIn("description", widget_data["visualization"]["query"])
        self.assertIn("options", widget_data["visualization"]["query"])


    # More tests will follow here
    
    def test_dashboard_group_permission_management_apis(self):
        """Test POST, GET, DELETE for dashboard group permissions."""
        owner_user = self.factory.user # This user owns the dashboard
        target_group = GroupFactory.create(org=self.factory.org, name="Target Test Group")
        dashboard = DashboardFactory.create(user=owner_user, org=self.factory.org)

        # 1. Test POST to grant permission
        grant_payload = {"access_type": ACCESS_TYPE_VIEW}
        response = self.make_request(
            "post",
            f"/api/dashboards/{dashboard.id}/groups/{target_group.id}",
            user=owner_user,
            json=grant_payload
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["group_id"], target_group.id)
        self.assertEqual(response.json["access_type"], ACCESS_TYPE_VIEW)

        # Verify in DB
        updated_dashboard = models.Dashboard.query.get(dashboard.id)
        self.assertIn(str(target_group.id), updated_dashboard.group_access_permissions)
        self.assertEqual(updated_dashboard.group_access_permissions[str(target_group.id)], ACCESS_TYPE_VIEW)

        # Test POST with invalid access_type
        grant_invalid_payload = {"access_type": "invalid_type"}
        response = self.make_request(
            "post",
            f"/api/dashboards/{dashboard.id}/groups/{target_group.id}",
            user=owner_user,
            json=grant_invalid_payload
        )
        self.assertEqual(response.status_code, 400)


        # 2. Test GET to list permissions
        response = self.make_request(
            "get",
            f"/api/dashboards/{dashboard.id}/groups",
            user=owner_user
        )
        self.assertEqual(response.status_code, 200)
        permissions_list = response.json
        self.assertEqual(len(permissions_list), 1)
        self.assertEqual(permissions_list[0]["group_id"], target_group.id)
        self.assertEqual(permissions_list[0]["group_name"], target_group.name)
        self.assertEqual(permissions_list[0]["access_type"], ACCESS_TYPE_VIEW)

        # 3. Test DELETE to revoke permission
        response = self.make_request(
            "delete",
            f"/api/dashboards/{dashboard.id}/groups/{target_group.id}",
            user=owner_user
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify in DB
        revoked_dashboard = models.Dashboard.query.get(dashboard.id)
        self.assertNotIn(str(target_group.id), revoked_dashboard.group_access_permissions)

        # Test DELETE for a non-existent permission (should be 404)
        response = self.make_request(
            "delete",
            f"/api/dashboards/{dashboard.id}/groups/{target_group.id}", # Trying to delete again
            user=owner_user
        )
        self.assertEqual(response.status_code, 404)
        
        # Test DELETE for a group that never had permissions (also 404)
        other_group = GroupFactory.create(org=self.factory.org, name="Other Group")
        response = self.make_request(
            "delete",
            f"/api/dashboards/{dashboard.id}/groups/{other_group.id}",
            user=owner_user
        )
        self.assertEqual(response.status_code, 404)


    def test_dashboard_group_permission_management_access_denied(self):
        """Test that non-owners/non-admins cannot manage dashboard group permissions."""
        owner_user = UserFactory.create(org=self.factory.org)
        dashboard = DashboardFactory.create(user=owner_user, org=self.factory.org)
        target_group = GroupFactory.create(org=self.factory.org)
        
        non_owner_user = UserFactory.create(org=self.factory.org) # Another regular user

        endpoints_to_test = [
            ("post", f"/api/dashboards/{dashboard.id}/groups/{target_group.id}", {"json": {"access_type": ACCESS_TYPE_VIEW}}),
            ("get", f"/api/dashboards/{dashboard.id}/groups", {}),
            ("delete", f"/api/dashboards/{dashboard.id}/groups/{target_group.id}", {}),
        ]

        # Test with dashboard_viewer_user
        for method, path, kwargs in endpoints_to_test:
            response = self.make_request(method, path, user=self.dashboard_viewer_user, **kwargs)
            self.assertEqual(response.status_code, 403, f"Viewer should get 403 for {method.upper()} {path}")

        # Test with non_owner_user
        for method, path, kwargs in endpoints_to_test:
            response = self.make_request(method, path, user=non_owner_user, **kwargs)
            self.assertEqual(response.status_code, 403, f"Non-owner should get 403 for {method.upper()} {path}")

    pass
