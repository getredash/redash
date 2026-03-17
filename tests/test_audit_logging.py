"""
Property-based tests for audit logging functionality.

Feature: rbac-enhancement
"""
import time
from unittest.mock import patch, MagicMock

from redash.models import ObjectPermission, Query, Dashboard, db
from redash.permissions import log_unauthorized_access
from tests import BaseTestCase


class TestPermissionChangeAuditLogging(BaseTestCase):
    """Test permission change audit logging."""
    
    @patch('redash.tasks.general.record_event')
    def test_property_24_permission_change_audit_logging(self, mock_record_event):
        """
        Feature: rbac-enhancement, Property 24: Permission change audit logging
        
        For any ObjectPermission modification, the system should create an audit log
        entry containing the User ID, object type, object ID, timestamp, and permission
        changes.
        
        Validates: Requirements 7.1
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create a new permission (simulating create action)
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.flush()
        
        # Log the permission change
        ObjectPermission.log_permission_change(perm, user.id, "create", None)
        
        # Verify record_event was called
        assert mock_record_event.delay.called
        
        # Get the event data that was logged
        call_args = mock_record_event.delay.call_args[0][0]
        
        # Verify all required fields are present
        assert "org_id" in call_args
        assert "user_id" in call_args
        assert "action" in call_args
        assert "object_type" in call_args
        assert "object_id" in call_args
        assert "timestamp" in call_args
        
        # Verify the values are correct
        assert call_args["org_id"] == user.org_id
        assert call_args["user_id"] == user.id
        assert call_args["action"] == "permission_create"
        assert call_args["object_type"] == "object_permission"
        assert call_args["object_id"] == str(perm.id)
        assert call_args["group_id"] == group.id
        assert call_args["target_object_type"] == "Query"
        assert call_args["target_object_id"] == query.id
        
        # Verify permission details are included
        assert "permissions" in call_args
        assert call_args["permissions"]["can_create"] is False
        assert call_args["permissions"]["can_read"] is True
        assert call_args["permissions"]["can_update"] is False
        assert call_args["permissions"]["can_delete"] is False
        
        # Test update action with old values
        mock_record_event.reset_mock()
        
        old_values = {
            "can_create": False,
            "can_read": True,
            "can_update": False,
            "can_delete": False,
        }
        
        # Update the permission
        perm.can_update = True
        db.session.flush()
        
        # Log the update
        ObjectPermission.log_permission_change(perm, user.id, "update", old_values)
        
        # Verify record_event was called again
        assert mock_record_event.delay.called
        
        # Get the event data
        call_args = mock_record_event.delay.call_args[0][0]
        
        # Verify action is update
        assert call_args["action"] == "permission_update"
        
        # Verify old values are included
        assert "old_permissions" in call_args
        assert call_args["old_permissions"]["can_update"] is False
        
        # Verify new values show the update
        assert call_args["permissions"]["can_update"] is True
        
        # Test with Dashboard
        mock_record_event.reset_mock()
        
        dashboard = self.factory.create_dashboard(org=user.org)
        
        dash_perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=True,
            can_read=True,
            can_update=True,
            can_delete=False,
        )
        
        db.session.add(dash_perm)
        db.session.flush()
        
        # Log the permission change
        ObjectPermission.log_permission_change(dash_perm, user.id, "create", None)
        
        # Verify record_event was called
        assert mock_record_event.delay.called
        
        # Get the event data
        call_args = mock_record_event.delay.call_args[0][0]
        
        # Verify Dashboard-specific fields
        assert call_args["target_object_type"] == "Dashboard"
        assert call_args["target_object_id"] == dashboard.id


class TestUnauthorizedAccessAuditLogging(BaseTestCase):
    """Test unauthorized access audit logging."""
    
    @patch('redash.tasks.general.record_event')
    def test_property_25_unauthorized_access_audit_logging(self, mock_record_event):
        """
        Feature: rbac-enhancement, Property 25: Unauthorized access audit logging
        
        For any failed authorization check, the system should create an audit log
        entry containing the User ID, object type, object ID, attempted action, and
        timestamp.
        
        Validates: Requirements 7.2
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
            can_update=False,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # Attempt unauthorized access (this will log it)
        log_unauthorized_access(query, user, "read")
        
        # Verify record_event was called
        assert mock_record_event.delay.called
        
        # Get the event data that was logged
        call_args = mock_record_event.delay.call_args[0][0]
        
        # Verify all required fields are present
        assert "org_id" in call_args
        assert "user_id" in call_args
        assert "action" in call_args
        assert "object_type" in call_args
        assert "object_id" in call_args
        assert "timestamp" in call_args
        assert "attempted_action" in call_args
        assert "reason" in call_args
        
        # Verify the values are correct
        assert call_args["org_id"] == user.org_id
        assert call_args["user_id"] == user.id
        assert call_args["action"] == "unauthorized_access"
        assert call_args["object_type"] == "query"
        assert call_args["object_id"] == str(query.id)
        assert call_args["attempted_action"] == "read"
        assert call_args["reason"] == "insufficient_permission"
        
        # Test with different permission types
        mock_record_event.reset_mock()
        
        log_unauthorized_access(query, user, "update")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        assert call_args["attempted_action"] == "update"
        
        # Test with Dashboard
        mock_record_event.reset_mock()
        
        dashboard = self.factory.create_dashboard(org=user.org)
        
        dash_perm = ObjectPermission(
            org_id=user.org_id,
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
        
        log_unauthorized_access(dashboard, user, "delete")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        
        assert call_args["object_type"] == "dashboard"
        assert call_args["object_id"] == str(dashboard.id)
        assert call_args["attempted_action"] == "delete"
        
        # Test with user who has no groups
        mock_record_event.reset_mock()
        
        user_no_groups = self.factory.create_user()
        user_no_groups.group_ids = []
        db.session.add(user_no_groups)
        db.session.commit()
        
        log_unauthorized_access(query, user_no_groups, "read")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        assert call_args["reason"] == "no_groups"


class TestAuditLogCompleteness(BaseTestCase):
    """Test audit log completeness."""
    
    @patch('redash.tasks.general.record_event')
    def test_property_26_audit_log_completeness(self, mock_record_event):
        """
        Feature: rbac-enhancement, Property 26: Audit log completeness
        
        For any audit log entry created by the RBAC system, the entry should contain
        sufficient information to identify who performed what action on which resource
        at what time.
        
        Validates: Requirements 7.4
        """
        # Create user and group
        user = self.factory.create_user()
        group = self.factory.create_group(org=user.org)
        
        # Flush to ensure group has an ID
        db.session.flush()
        
        # Create query
        query = self.factory.create_query(org=user.org)
        
        # Create a permission
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=True,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.flush()
        
        # Log the permission change
        ObjectPermission.log_permission_change(perm, user.id, "create", None)
        
        # Verify record_event was called
        assert mock_record_event.delay.called
        
        # Get the event data
        call_args = mock_record_event.delay.call_args[0][0]
        
        # Verify WHO: user_id is present
        assert "user_id" in call_args
        assert call_args["user_id"] == user.id
        
        # Verify WHAT: action is present and descriptive
        assert "action" in call_args
        assert call_args["action"] == "permission_create"
        
        # Verify WHICH: object identification is complete
        assert "object_type" in call_args
        assert "object_id" in call_args
        assert "target_object_type" in call_args
        assert "target_object_id" in call_args
        assert call_args["target_object_type"] == "Query"
        assert call_args["target_object_id"] == query.id
        
        # Verify WHEN: timestamp is present
        assert "timestamp" in call_args
        assert isinstance(call_args["timestamp"], int)
        assert call_args["timestamp"] > 0
        
        # Verify additional context is present
        assert "group_id" in call_args
        assert "permissions" in call_args
        
        # The combination of these fields should uniquely identify the event
        # and provide full context for audit purposes


class TestUnauthorizedAccessLogDetail(BaseTestCase):
    """Test unauthorized access log detail."""
    
    @patch('redash.tasks.general.record_event')
    def test_property_27_unauthorized_access_log_detail(self, mock_record_event):
        """
        Feature: rbac-enhancement, Property 27: Unauthorized access log detail
        
        For any unauthorized access log entry, the entry should include the attempted
        action (create/read/update/delete) and the reason for denial.
        
        Validates: Requirements 7.5
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
        
        # Test case 1: User has permission records but insufficient permission
        perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Query",
            object_id=query.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=False,
        )
        
        db.session.add(perm)
        db.session.commit()
        
        # Test all CRUD actions
        for action in ["create", "read", "update", "delete"]:
            mock_record_event.reset_mock()
            
            log_unauthorized_access(query, user, action)
            
            assert mock_record_event.delay.called
            call_args = mock_record_event.delay.call_args[0][0]
            
            # Verify attempted action is included
            assert "attempted_action" in call_args
            assert call_args["attempted_action"] == action
            
            # Verify reason is included
            assert "reason" in call_args
            assert call_args["reason"] == "insufficient_permission"
        
        # Test case 2: User has no groups
        mock_record_event.reset_mock()
        
        user_no_groups = self.factory.create_user()
        user_no_groups.group_ids = []
        db.session.add(user_no_groups)
        db.session.commit()
        
        log_unauthorized_access(query, user_no_groups, "read")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        
        assert call_args["attempted_action"] == "read"
        assert call_args["reason"] == "no_groups"
        
        # Test case 3: No permission records exist
        mock_record_event.reset_mock()
        
        query2 = self.factory.create_query(org=user.org)
        # Don't create any ObjectPermission records for query2
        
        log_unauthorized_access(query2, user, "update")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        
        assert call_args["attempted_action"] == "update"
        assert call_args["reason"] == "no_permission_records"
        
        # Test with Dashboard
        mock_record_event.reset_mock()
        
        dashboard = self.factory.create_dashboard(org=user.org)
        
        dash_perm = ObjectPermission(
            org_id=user.org_id,
            group_id=group.id,
            object_type="Dashboard",
            object_id=dashboard.id,
            can_create=False,
            can_read=False,
            can_update=False,
            can_delete=True,  # Has delete but not read
        )
        
        db.session.add(dash_perm)
        db.session.commit()
        
        log_unauthorized_access(dashboard, user, "read")
        
        assert mock_record_event.delay.called
        call_args = mock_record_event.delay.call_args[0][0]
        
        assert call_args["object_type"] == "dashboard"
        assert call_args["attempted_action"] == "read"
        assert call_args["reason"] == "insufficient_permission"
