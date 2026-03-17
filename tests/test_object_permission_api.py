"""
Property-based tests for object permission API endpoints.

Feature: rbac-enhancement
"""
from redash.models import ObjectPermission, Query, Dashboard, Group, User, db
from tests import BaseTestCase, authenticate_request


class TestPermissionModificationPersistence(BaseTestCase):
    """Test permission modification persistence."""
    
    def test_property_15_permission_modification_persistence(self):
        """
        Feature: rbac-enhancement, Property 15: Permission modification persistence
        
        For any Query or Dashboard with update permission, when a User modifies the
        ObjectPermission records and saves, retrieving the permissions should return
        the updated values.
        
        Validates: Requirements 3.2, 4.2
        """
        # Test with Query
        admin_user = self.factory.create_admin()
        query = self.factory.create_query(org=admin_user.org)
        group = self.factory.create_group(org=admin_user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        # Create initial permission
        perm = ObjectPermission(
            org_id=admin_user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        db.session.add(perm)
        db.session.commit()
        
        # Modify permissions via API
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            # Update permissions
            response = client.post(
                f"/{admin_user.org.slug}/api/queries/{query.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": group.id,
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                        }
                    ]
                }
            )
            
            assert response.status_code == 200
            
            # Retrieve permissions and verify they were updated
            response = client.get(f"/{admin_user.org.slug}/api/queries/{query.id}/permissions")
            assert response.status_code == 200
            
            data = response.json
            perms = data["permissions"]
            group_perm = next(p for p in perms if p["group_id"] == group.id)
            
            assert group_perm["can_create"] is True
            assert group_perm["can_read"] is True
            assert group_perm["can_update"] is True
            assert group_perm["can_delete"] is True
        
        # Test with Dashboard
        dashboard = self.factory.create_dashboard(org=admin_user.org)
        
        # Create initial permission
        dash_perm = ObjectPermission(
            org_id=admin_user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        db.session.add(dash_perm)
        db.session.commit()
        
        # Modify permissions via API
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            # Update permissions
            response = client.post(
                f"/{admin_user.org.slug}/api/dashboards/{dashboard.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": group.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": False,
                        }
                    ]
                }
            )
            
            assert response.status_code == 200
            
            # Retrieve permissions and verify they were updated
            response = client.get(f"/{admin_user.org.slug}/api/dashboards/{dashboard.id}/permissions")
            assert response.status_code == 200
            
            data = response.json
            perms = data["permissions"]
            group_perm = next(p for p in perms if p["group_id"] == group.id)
            
            assert group_perm["can_create"] is False
            assert group_perm["can_read"] is True
            assert group_perm["can_update"] is True
            assert group_perm["can_delete"] is False


class TestPermissionValidationFeedback(BaseTestCase):
    """Test permission validation feedback."""
    
    def test_property_16_permission_validation_feedback(self):
        """
        Feature: rbac-enhancement, Property 16: Permission validation feedback
        
        For any permission modification attempt, if the input is invalid (e.g.,
        non-existent group), the system should return an error response with
        appropriate feedback; if valid, it should return success.
        
        Validates: Requirements 3.5, 4.5
        """
        admin_user = self.factory.create_admin()
        query = self.factory.create_query(org=admin_user.org)
        group = self.factory.create_group(org=admin_user.org)
        
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            # Test 1: Invalid group_id
            response = client.post(
                f"/{admin_user.org.slug}/api/queries/{query.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": 99999,  # Non-existent group
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                        }
                    ]
                }
            )
            
            assert response.status_code == 400
            assert "not found" in response.json["message"].lower()
            
            # Test 2: Missing group_id
            response = client.post(
                f"/{admin_user.org.slug}/api/queries/{query.id}/permissions",
                json={
                    "permissions": [
                        {
                            "can_create": True,
                            "can_read": True,
                        }
                    ]
                }
            )
            
            assert response.status_code == 400
            assert "group_id" in response.json["message"].lower()
            
            # Test 3: Invalid permissions format (not a list)
            response = client.post(
                f"/{admin_user.org.slug}/api/queries/{query.id}/permissions",
                json={
                    "permissions": "invalid"
                }
            )
            
            assert response.status_code == 400
            assert "list" in response.json["message"].lower()
            
            # Test 4: Valid input should succeed
            response = client.post(
                f"/{admin_user.org.slug}/api/queries/{query.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": group.id,
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                        }
                    ]
                }
            )
            
            assert response.status_code == 200
            assert "success" in response.json["message"].lower()
        
        # Test with Dashboard
        dashboard = self.factory.create_dashboard(org=admin_user.org)
        
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            # Test invalid group_id
            response = client.post(
                f"/{admin_user.org.slug}/api/dashboards/{dashboard.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": 99999,  # Non-existent group
                            "can_create": True,
                            "can_read": True,
                        }
                    ]
                }
            )
            
            assert response.status_code == 400
            assert "not found" in response.json["message"].lower()
            
            # Test valid input
            response = client.post(
                f"/{admin_user.org.slug}/api/dashboards/{dashboard.id}/permissions",
                json={
                    "permissions": [
                        {
                            "group_id": group.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": False,
                            "can_delete": False,
                        }
                    ]
                }
            )
            
            assert response.status_code == 200
            assert "success" in response.json["message"].lower()


class TestGroupPermissionDisplayAccuracy(BaseTestCase):
    """Test group permission display accuracy."""
    
    def test_property_17_group_permission_display_accuracy(self):
        """
        Feature: rbac-enhancement, Property 17: Group permission display accuracy
        
        For any Group, when displaying the object permissions for that Group, the
        displayed data should match the actual ObjectPermission records in the database.
        
        Validates: Requirements 5.2
        """
        admin_user = self.factory.create_admin()
        group = self.factory.create_group(org=admin_user.org)
        
        # Create queries and dashboards with permissions
        query1 = self.factory.create_query(org=admin_user.org, name="Query 1")
        query2 = self.factory.create_query(org=admin_user.org, name="Query 2")
        dashboard1 = self.factory.create_dashboard(org=admin_user.org, name="Dashboard 1")
        
        # Create permissions
        perm1 = ObjectPermission(
            org_id=admin_user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query1.id,
            can_create=True,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        perm2 = ObjectPermission(
            org_id=admin_user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query2.id,
            can_create=False,
            can_read=True,
            can_update=True,
            can_delete=False,
        )
        
        perm3 = ObjectPermission(
            org_id=admin_user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard1.id,
            can_create=False,
            can_read=True,
            can_update=True,
            can_delete=True,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # Retrieve permissions via API
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            response = client.get(f"/{admin_user.org.slug}/api/groups/{group.id}/object_permissions")
            assert response.status_code == 200
            
            data = response.json
            
            # Verify queries
            assert len(data["queries"]) == 2
            
            query1_perm = next(q for q in data["queries"] if q["object_id"] == query1.id)
            assert query1_perm["name"] == "Query 1"
            assert query1_perm["can_create"] is True
            assert query1_perm["can_read"] is True
            assert query1_perm["can_update"] is False
            assert query1_perm["can_delete"] is False
            
            query2_perm = next(q for q in data["queries"] if q["object_id"] == query2.id)
            assert query2_perm["name"] == "Query 2"
            assert query2_perm["can_create"] is False
            assert query2_perm["can_read"] is True
            assert query2_perm["can_update"] is True
            assert query2_perm["can_delete"] is False
            
            # Verify dashboards
            assert len(data["dashboards"]) == 1
            
            dashboard1_perm = data["dashboards"][0]
            assert dashboard1_perm["object_id"] == dashboard1.id
            assert dashboard1_perm["name"] == "Dashboard 1"
            assert dashboard1_perm["can_create"] is False
            assert dashboard1_perm["can_read"] is True
            assert dashboard1_perm["can_update"] is True
            assert dashboard1_perm["can_delete"] is True


class TestBulkPermissionUpdates(BaseTestCase):
    """Test bulk permission updates."""
    
    def test_property_18_bulk_permission_updates(self):
        """
        Feature: rbac-enhancement, Property 18: Bulk permission updates
        
        For any Group and set of ObjectPermission changes, applying bulk updates
        should result in all specified permissions being updated atomically.
        
        Validates: Requirements 5.3
        """
        admin_user = self.factory.create_admin()
        group = self.factory.create_group(org=admin_user.org)
        
        # Create multiple queries and dashboards
        query1 = self.factory.create_query(org=admin_user.org, name="Query 1")
        query2 = self.factory.create_query(org=admin_user.org, name="Query 2")
        dashboard1 = self.factory.create_dashboard(org=admin_user.org, name="Dashboard 1")
        dashboard2 = self.factory.create_dashboard(org=admin_user.org, name="Dashboard 2")
        
        # Perform bulk update
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            response = client.post(
                f"/{admin_user.org.slug}/api/groups/{group.id}/object_permissions",
                json={
                    "queries": [
                        {
                            "object_id": query1.id,
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": False,
                        },
                        {
                            "object_id": query2.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": False,
                            "can_delete": False,
                        }
                    ],
                    "dashboards": [
                        {
                            "object_id": dashboard1.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                        },
                        {
                            "object_id": dashboard2.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": False,
                            "can_delete": False,
                        }
                    ]
                }
            )
            
            assert response.status_code == 200
            assert "success" in response.json["message"].lower()
            
            # Verify all permissions were updated
            response = client.get(f"/{admin_user.org.slug}/api/groups/{group.id}/object_permissions")
            assert response.status_code == 200
            
            data = response.json
            
            # Verify all queries were updated
            assert len(data["queries"]) == 2
            query1_perm = next(q for q in data["queries"] if q["object_id"] == query1.id)
            assert query1_perm["can_create"] is True
            assert query1_perm["can_read"] is True
            assert query1_perm["can_update"] is True
            assert query1_perm["can_delete"] is False
            
            query2_perm = next(q for q in data["queries"] if q["object_id"] == query2.id)
            assert query2_perm["can_create"] is False
            assert query2_perm["can_read"] is True
            assert query2_perm["can_update"] is False
            assert query2_perm["can_delete"] is False
            
            # Verify all dashboards were updated
            assert len(data["dashboards"]) == 2
            dashboard1_perm = next(d for d in data["dashboards"] if d["object_id"] == dashboard1.id)
            assert dashboard1_perm["can_create"] is False
            assert dashboard1_perm["can_read"] is True
            assert dashboard1_perm["can_update"] is True
            assert dashboard1_perm["can_delete"] is True
            
            dashboard2_perm = next(d for d in data["dashboards"] if d["object_id"] == dashboard2.id)
            assert dashboard2_perm["can_create"] is False
            assert dashboard2_perm["can_read"] is True
            assert dashboard2_perm["can_update"] is False
            assert dashboard2_perm["can_delete"] is False


class TestGroupPermissionSaveConfirmation(BaseTestCase):
    """Test group permission save confirmation."""
    
    def test_property_19_group_permission_save_confirmation(self):
        """
        Feature: rbac-enhancement, Property 19: Group permission save confirmation
        
        For any Group permission modification, after saving, the system should persist
        the changes and return a success confirmation.
        
        Validates: Requirements 5.5
        """
        admin_user = self.factory.create_admin()
        group = self.factory.create_group(org=admin_user.org)
        query = self.factory.create_query(org=admin_user.org)
        dashboard = self.factory.create_dashboard(org=admin_user.org)
        
        with self.app.test_client() as client:
            # Login as admin
            authenticate_request(client, admin_user)
            
            # Save permissions
            response = client.post(
                f"/{admin_user.org.slug}/api/groups/{group.id}/object_permissions",
                json={
                    "queries": [
                        {
                            "object_id": query.id,
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                        }
                    ],
                    "dashboards": [
                        {
                            "object_id": dashboard.id,
                            "can_create": False,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": False,
                        }
                    ]
                }
            )
            
            # Should return success confirmation
            assert response.status_code == 200
            assert "message" in response.json
            assert "success" in response.json["message"].lower()
            
            # Verify changes were persisted in database
            query_perm = ObjectPermission.query.filter(
                ObjectPermission.group_id == group.id,
                ObjectPermission.object_type == "Query",
                ObjectPermission.object_id == query.id
            ).first()
            
            assert query_perm is not None
            assert query_perm.can_create is True
            assert query_perm.can_read is True
            assert query_perm.can_update is True
            assert query_perm.can_delete is True
            
            dashboard_perm = ObjectPermission.query.filter(
                ObjectPermission.group_id == group.id,
                ObjectPermission.object_type == "Dashboard",
                ObjectPermission.object_id == dashboard.id
            ).first()
            
            assert dashboard_perm is not None
            assert dashboard_perm.can_create is False
            assert dashboard_perm.can_read is True
            assert dashboard_perm.can_update is True
            assert dashboard_perm.can_delete is False
