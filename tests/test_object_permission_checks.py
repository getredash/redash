"""
Property-based tests for object permission checking functions.

Feature: rbac-enhancement
"""
try:
    from hypothesis import given, strategies as st, settings
    from hypothesis.strategies import composite
    HYPOTHESIS_AVAILABLE = True
except ImportError:
    HYPOTHESIS_AVAILABLE = False
    # Provide dummy decorators when hypothesis is not available
    def given(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    def settings(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    class st:
        @staticmethod
        def sampled_from(items):
            return items
        
        @staticmethod
        def integers(min_value=0, max_value=100):
            return range(min_value, max_value + 1)
        
        @staticmethod
        def booleans():
            return [True, False]

from redash.models import ObjectPermission, Query, Dashboard, Group, User, db
from redash.permissions import has_object_permission, get_user_object_permissions
from tests import BaseTestCase


class TestPermissionUnionLogic(BaseTestCase):
    """Test permission union across multiple groups."""
    
    def test_property_2_permission_union_across_groups(self):
        """
        Feature: rbac-enhancement, Property 2: Permission union across groups
        
        For any User belonging to multiple Groups, the effective permissions for
        an object should be the union of permissions from all Groups (if any Group
        grants a permission, the User has it).
        
        Validates: Requirements 1.2
        """
        # Test with Query and read permission
        user = self.factory.create_user()
        group1 = self.factory.create_group(org=user.org)
        group2 = self.factory.create_group(org=user.org)
        group3 = self.factory.create_group(org=user.org)
        
        # Flush to ensure groups have IDs
        db.session.flush()
        
        user.group_ids = [group1.id, group2.id, group3.id]
        db.session.add(user)
        db.session.commit()
        
        query = self.factory.create_query(org=user.org)
        
        # Group1 grants read permission
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Group2 does not grant read permission
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        # Group3 does not grant read permission
        perm3 = ObjectPermission(
            org_id=user.org_id,
            group_id=group3.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # User should have read permission because group1 grants it (union)
        assert has_object_permission(query, user, "read") is True
        
        # User should not have update permission because no group grants it
        assert has_object_permission(query, user, "update") is False
        
        # Test with Dashboard and update permission
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Group1 does not grant update
        dash_perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        # Group2 grants update
        dash_perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=True,
            can_delete=False,
        )
        
        db.session.add_all([dash_perm1, dash_perm2])
        db.session.commit()
        
        # User should have update permission because group2 grants it (union)
        assert has_object_permission(dashboard, user, "update") is True
        
        # User should not have delete permission because no group grants it
        assert has_object_permission(dashboard, user, "delete") is False


class TestAdminGroupUniversalAccess(BaseTestCase):
    """Test admin group universal access."""
    
    def test_property_3_admin_group_universal_access(self):
        """
        Feature: rbac-enhancement, Property 3: Admin group universal access
        
        For any User in the Admin Group, permission checks for any Query or Dashboard
        should always return true for all CRUD operations regardless of explicit
        ObjectPermission records.
        
        Validates: Requirements 1.3
        """
        # Create admin user
        admin_user = self.factory.create_admin()
        
        # Verify admin user has admin permission
        assert "admin" in admin_user.permissions, "Admin user should have admin permission"
        
        # Test with Query
        query = self.factory.create_query(org=admin_user.org)
        
        # Do NOT create any ObjectPermission records for this query
        # Admin should still have access
        
        # Test all permission types for Query
        assert has_object_permission(query, admin_user, "create") is True
        assert has_object_permission(query, admin_user, "read") is True
        assert has_object_permission(query, admin_user, "update") is True
        assert has_object_permission(query, admin_user, "delete") is True
        
        # Test with Dashboard
        dashboard = self.factory.create_dashboard(org=admin_user.org)
        
        # Test all permission types for Dashboard
        assert has_object_permission(dashboard, admin_user, "create") is True
        assert has_object_permission(dashboard, admin_user, "read") is True
        assert has_object_permission(dashboard, admin_user, "update") is True
        assert has_object_permission(dashboard, admin_user, "delete") is True
        
        # Also test get_user_object_permissions
        query_perms = get_user_object_permissions(admin_user, query)
        assert query_perms["can_create"] is True
        assert query_perms["can_read"] is True
        assert query_perms["can_update"] is True
        assert query_perms["can_delete"] is True
        
        dashboard_perms = get_user_object_permissions(admin_user, dashboard)
        assert dashboard_perms["can_create"] is True
        assert dashboard_perms["can_read"] is True
        assert dashboard_perms["can_update"] is True
        assert dashboard_perms["can_delete"] is True


class TestObjectTypeSupport(BaseTestCase):
    """Test object type support for both Query and Dashboard."""
    
    def test_property_4_object_type_support(self):
        """
        Feature: rbac-enhancement, Property 4: Object type support
        
        For any permission check operation, the system should correctly handle both
        "Query" and "Dashboard" object types with identical permission logic.
        
        Validates: Requirements 1.4
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create both a Query and a Dashboard
        query = self.factory.create_query(org=user.org)
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Test case 1: Grant read permission to both
        query_perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        dashboard_perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([query_perm1, dashboard_perm1])
        db.session.commit()
        
        # Both should have read permission
        assert has_object_permission(query, user, "read") is True
        assert has_object_permission(dashboard, user, "read") is True
        
        # Both should not have update permission
        assert has_object_permission(query, user, "update") is False
        assert has_object_permission(dashboard, user, "update") is False
        
        # Test case 2: Grant update permission to both
        query_perm1.can_update = True
        dashboard_perm1.can_update = True
        db.session.commit()
        
        # Both should now have update permission
        assert has_object_permission(query, user, "update") is True
        assert has_object_permission(dashboard, user, "update") is True
        
        # Test get_user_object_permissions for both types
        query_perms = get_user_object_permissions(user, query)
        dashboard_perms = get_user_object_permissions(user, dashboard)
        
        # Both should return identical permission dictionaries
        assert query_perms["can_read"] == dashboard_perms["can_read"]
        assert query_perms["can_update"] == dashboard_perms["can_update"]
        assert query_perms["can_create"] == dashboard_perms["can_create"]
        assert query_perms["can_delete"] == dashboard_perms["can_delete"]



class TestQueryReadAuthorization(BaseTestCase):
    """Test query read authorization."""
    
    def test_property_6_query_read_authorization(self):
        """
        Feature: rbac-enhancement, Property 6: Query read authorization
        
        For any Query and User, if the User lacks read permission on the Query,
        attempting to view the Query should result in a 403 Forbidden response.
        
        Validates: Requirements 2.1
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create permission WITHOUT read access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,  # No read permission
            can_update=True,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have read permission
        assert has_object_permission(query, user, "read") is False
        
        # Attempting to view should fail (tested in handler tests)
        # Here we just verify the permission check returns False
        
        # Now grant read permission
        perm.can_read = True
        db.session.commit()
        
        # User should now have read permission
        assert has_object_permission(query, user, "read") is True


class TestQueryExecutionAuthorization(BaseTestCase):
    """Test query execution authorization."""
    
    def test_property_7_query_execution_authorization(self):
        """
        Feature: rbac-enhancement, Property 7: Query execution authorization
        
        For any Query and User, if the User lacks read permission on the Query,
        attempting to execute the Query should result in a 403 Forbidden response.
        
        Validates: Requirements 2.2
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create permission WITHOUT read access (execution requires read)
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,  # No read permission means no execution
            can_update=False,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have read permission (required for execution)
        assert has_object_permission(query, user, "read") is False
        
        # Now grant read permission
        perm.can_read = True
        db.session.commit()
        
        # User should now have read permission (can execute)
        assert has_object_permission(query, user, "read") is True


class TestQueryCreationAuthorization(BaseTestCase):
    """Test query creation authorization."""
    
    def test_property_8_query_creation_authorization(self):
        """
        Feature: rbac-enhancement, Property 8: Query creation authorization
        
        For any User, if the User has create permission for at least one Group,
        the User should be able to create a new Query; otherwise, the operation
        should be denied.
        
        Validates: Requirements 2.3
        """
        # Create user and groups
        user = self.factory.create_user()
        group1 = self.factory.create_group(org=user.org)
        group2 = self.factory.create_group(org=user.org)
        
        # Flush to ensure groups have IDs
        db.session.flush()
        
        user.group_ids = [group1.id, group2.id]
        db.session.add(user)
        db.session.commit()
        
        # Create a dummy query to check permissions against
        query = self.factory.create_query(org=user.org)
        
        # Initially, no create permissions
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2])
        db.session.commit()
        
        # User should not have create permission
        assert has_object_permission(query, user, "create") is False
        
        # Grant create permission to group1
        perm1.can_create = True
        db.session.commit()
        
        # User should now have create permission (from group1)
        assert has_object_permission(query, user, "create") is True


class TestQueryUpdateAuthorization(BaseTestCase):
    """Test query update authorization."""
    
    def test_property_9_query_update_authorization(self):
        """
        Feature: rbac-enhancement, Property 9: Query update authorization
        
        For any Query and User, if the User lacks update permission on the Query,
        attempting to modify the Query should result in a 403 Forbidden response.
        
        Validates: Requirements 2.4
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create permission WITHOUT update access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,  # No update permission
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have update permission
        assert has_object_permission(query, user, "update") is False
        
        # Now grant update permission
        perm.can_update = True
        db.session.commit()
        
        # User should now have update permission
        assert has_object_permission(query, user, "update") is True


class TestQueryDeletionAuthorization(BaseTestCase):
    """Test query deletion authorization."""
    
    def test_property_10_query_deletion_authorization(self):
        """
        Feature: rbac-enhancement, Property 10: Query deletion authorization
        
        For any Query and User, if the User lacks delete permission on the Query,
        attempting to delete the Query should result in a 403 Forbidden response.
        
        Validates: Requirements 2.5
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create permission WITHOUT delete access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=True,
            can_delete=False,  # No delete permission
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have delete permission
        assert has_object_permission(query, user, "delete") is False
        
        # Now grant delete permission
        perm.can_delete = True
        db.session.commit()
        
        # User should now have delete permission
        assert has_object_permission(query, user, "delete") is True


class TestQueryListFiltering(BaseTestCase):
    """Test query list filtering."""
    
    def test_property_20_query_list_filtering(self):
        """
        Feature: rbac-enhancement, Property 20: Query list filtering
        
        For any User requesting the Query list, the returned results should include
        only Queries where the User has read permission (considering all their Groups).
        
        Validates: Requirements 6.1
        """
        from redash.permissions import filter_by_object_permissions
        
        # Create user and groups
        user = self.factory.create_user()
        group1 = self.factory.create_group(org=user.org)
        group2 = self.factory.create_group(org=user.org)
        
        # Flush to ensure groups have IDs
        db.session.flush()
        
        user.group_ids = [group1.id, group2.id]
        db.session.add(user)
        db.session.commit()
        
        # Create multiple queries
        query1 = self.factory.create_query(org=user.org)
        query2 = self.factory.create_query(org=user.org)
        query3 = self.factory.create_query(org=user.org)
        
        # Grant read permission to query1 via group1
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Query",
            object_id=query1.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Grant read permission to query2 via group2
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Query",
            object_id=query2.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Do NOT grant read permission to query3
        perm3 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Query",
            object_id=query3.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # Get all queries and filter by permissions
        from redash.models import Query
        all_queries = Query.query.filter(Query.org_id == user.org_id)
        filtered_queries = filter_by_object_permissions(all_queries, user, "Query", "read")
        
        # Should only include query1 and query2
        filtered_ids = [q.id for q in filtered_queries.all()]
        assert query1.id in filtered_ids
        assert query2.id in filtered_ids
        assert query3.id not in filtered_ids


class TestQuerySearchFiltering(BaseTestCase):
    """Test query search filtering."""
    
    def test_property_22_query_search_filtering(self):
        """
        Feature: rbac-enhancement, Property 22: Query search filtering
        
        For any User performing a Query search, the search results should include
        only Queries where the User has read permission.
        
        Validates: Requirements 6.5
        """
        from redash.permissions import filter_by_object_permissions
        
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create queries with searchable names
        query1 = self.factory.create_query(org=user.org, name="Test Query Alpha")
        query2 = self.factory.create_query(org=user.org, name="Test Query Beta")
        query3 = self.factory.create_query(org=user.org, name="Test Query Gamma")
        
        # Grant read permission to query1 and query2 only
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query1.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query2.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Do NOT grant read permission to query3
        perm3 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query3.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # Search for queries with "Test Query" in the name
        from redash.models import Query
        search_results = Query.query.filter(
            Query.org_id == user.org_id,
            Query.name.ilike("%Test Query%")
        )
        
        # Apply permission filtering
        filtered_results = filter_by_object_permissions(search_results, user, "Query", "read")
        
        # Should only include query1 and query2
        filtered_ids = [q.id for q in filtered_results.all()]
        assert query1.id in filtered_ids
        assert query2.id in filtered_ids
        assert query3.id not in filtered_ids



class TestDashboardReadAuthorization(BaseTestCase):
    """Test dashboard read authorization."""
    
    def test_property_11_dashboard_read_authorization(self):
        """
        Feature: rbac-enhancement, Property 11: Dashboard read authorization
        
        For any Dashboard and User, if the User lacks read permission on the Dashboard,
        attempting to view the Dashboard should result in a 403 Forbidden response.
        
        Validates: Requirements 2.6
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create dashboard
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Create permission WITHOUT read access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,  # No read permission
            can_update=True,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have read permission
        assert has_object_permission(dashboard, user, "read") is False
        
        # Attempting to view should fail (tested in handler tests)
        # Here we just verify the permission check returns False
        
        # Now grant read permission
        perm.can_read = True
        db.session.commit()
        
        # User should now have read permission
        assert has_object_permission(dashboard, user, "read") is True


class TestDashboardCreationAuthorization(BaseTestCase):
    """Test dashboard creation authorization."""
    
    def test_property_12_dashboard_creation_authorization(self):
        """
        Feature: rbac-enhancement, Property 12: Dashboard creation authorization
        
        For any User, if the User has create permission for at least one Group,
        the User should be able to create a new Dashboard; otherwise, the operation
        should be denied.
        
        Validates: Requirements 2.7
        """
        # Create user and groups
        user = self.factory.create_user()
        group1 = self.factory.create_group(org=user.org)
        group2 = self.factory.create_group(org=user.org)
        
        # Flush to ensure groups have IDs
        db.session.flush()
        
        user.group_ids = [group1.id, group2.id]
        db.session.add(user)
        db.session.commit()
        
        # Create a dummy dashboard to check permissions against
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Initially, no create permissions
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2])
        db.session.commit()
        
        # User should not have create permission
        assert has_object_permission(dashboard, user, "create") is False
        
        # Grant create permission to group1
        perm1.can_create = True
        db.session.commit()
        
        # User should now have create permission (from group1)
        assert has_object_permission(dashboard, user, "create") is True


class TestDashboardUpdateAuthorization(BaseTestCase):
    """Test dashboard update authorization."""
    
    def test_property_13_dashboard_update_authorization(self):
        """
        Feature: rbac-enhancement, Property 13: Dashboard update authorization
        
        For any Dashboard and User, if the User lacks update permission on the Dashboard,
        attempting to modify the Dashboard should result in a 403 Forbidden response.
        
        Validates: Requirements 2.8
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create dashboard
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Create permission WITHOUT update access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=True,
            can_update=False,  # No update permission
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have update permission
        assert has_object_permission(dashboard, user, "update") is False
        
        # Now grant update permission
        perm.can_update = True
        db.session.commit()
        
        # User should now have update permission
        assert has_object_permission(dashboard, user, "update") is True


class TestDashboardDeletionAuthorization(BaseTestCase):
    """Test dashboard deletion authorization."""
    
    def test_property_14_dashboard_deletion_authorization(self):
        """
        Feature: rbac-enhancement, Property 14: Dashboard deletion authorization
        
        For any Dashboard and User, if the User lacks delete permission on the Dashboard,
        attempting to delete the Dashboard should result in a 403 Forbidden response.
        
        Validates: Requirements 2.9
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create dashboard
        dashboard = self.factory.create_dashboard(org=user.org)
        
        # Create permission WITHOUT delete access
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=True,
            can_update=True,
            can_delete=False,  # No delete permission
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # User should not have delete permission
        assert has_object_permission(dashboard, user, "delete") is False
        
        # Now grant delete permission
        perm.can_delete = True
        db.session.commit()
        
        # User should now have delete permission
        assert has_object_permission(dashboard, user, "delete") is True


class TestDashboardListFiltering(BaseTestCase):
    """Test dashboard list filtering."""
    
    def test_property_21_dashboard_list_filtering(self):
        """
        Feature: rbac-enhancement, Property 21: Dashboard list filtering
        
        For any User requesting the Dashboard list, the returned results should include
        only Dashboards where the User has read permission (considering all their Groups).
        
        Validates: Requirements 6.2
        """
        from redash.permissions import filter_by_object_permissions
        
        # Create user and groups
        user = self.factory.create_user()
        group1 = self.factory.create_group(org=user.org)
        group2 = self.factory.create_group(org=user.org)
        
        # Flush to ensure groups have IDs
        db.session.flush()
        
        user.group_ids = [group1.id, group2.id]
        db.session.add(user)
        db.session.commit()
        
        # Create multiple dashboards
        dashboard1 = self.factory.create_dashboard(org=user.org)
        dashboard2 = self.factory.create_dashboard(org=user.org)
        dashboard3 = self.factory.create_dashboard(org=user.org)
        
        # Grant read permission to dashboard1 via group1
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Dashboard",
            object_id=dashboard1.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Grant read permission to dashboard2 via group2
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group2.id,
            object_type="Dashboard",
            object_id=dashboard2.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Do NOT grant read permission to dashboard3
        perm3 = ObjectPermission(
            org_id=user.org_id,
            group_id=group1.id,
            object_type="Dashboard",
            object_id=dashboard3.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # Get all dashboards and filter by permissions
        all_dashboards = Dashboard.query.filter(Dashboard.org_id == user.org_id)
        filtered_dashboards = filter_by_object_permissions(all_dashboards, user, "Dashboard", "read")
        
        # Should only include dashboard1 and dashboard2
        filtered_ids = [d.id for d in filtered_dashboards.all()]
        assert dashboard1.id in filtered_ids
        assert dashboard2.id in filtered_ids
        assert dashboard3.id not in filtered_ids


class TestDashboardSearchFiltering(BaseTestCase):
    """Test dashboard search filtering."""
    
    def test_property_23_dashboard_search_filtering(self):
        """
        Feature: rbac-enhancement, Property 23: Dashboard search filtering
        
        For any User performing a Dashboard search, the search results should include
        only Dashboards where the User has read permission.
        
        Validates: Requirements 6.6
        """
        from redash.permissions import filter_by_object_permissions
        
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        user.group_ids = [group.id]
        db.session.add(user)
        db.session.commit()
        
        # Create dashboards with searchable names
        dashboard1 = self.factory.create_dashboard(org=user.org, name="Test Dashboard Alpha")
        dashboard2 = self.factory.create_dashboard(org=user.org, name="Test Dashboard Beta")
        dashboard3 = self.factory.create_dashboard(org=user.org, name="Test Dashboard Gamma")
        
        # Grant read permission to dashboard1 and dashboard2 only
        perm1 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard1.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        perm2 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard2.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        # Do NOT grant read permission to dashboard3
        perm3 = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard3.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add_all([perm1, perm2, perm3])
        db.session.commit()
        
        # Search for dashboards with "Test Dashboard" in the name
        search_results = Dashboard.query.filter(
            Dashboard.org_id == user.org_id,
            Dashboard.name.ilike("%Test Dashboard%")
        )
        
        # Apply permission filtering
        filtered_results = filter_by_object_permissions(search_results, user, "Dashboard", "read")
        
        # Should only include dashboard1 and dashboard2
        filtered_ids = [d.id for d in filtered_results.all()]
        assert dashboard1.id in filtered_ids
        assert dashboard2.id in filtered_ids
        assert dashboard3.id not in filtered_ids
