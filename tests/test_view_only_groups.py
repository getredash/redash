import pytest
from redash import models
from redash.models import db
from tests import BaseTestCase


class TestViewOnlyGroups(BaseTestCase):
    def test_group_can_be_marked_as_view_only(self):
        """Test that a group can have is_view_only flag"""
        group = self.factory.create_group(name="View Only Group")
        group.is_view_only = True
        db.session.add(group)
        db.session.commit()
        
        # Reload from database
        group = models.Group.query.get(group.id)
        self.assertTrue(group.is_view_only)
    
    def test_default_group_is_not_view_only(self):
        """Test that groups are not view-only by default"""
        group = self.factory.create_group(name="Regular Group")
        db.session.add(group)
        db.session.commit()
        
        # Reload from database
        group = models.Group.query.get(group.id)
        self.assertFalse(group.is_view_only)
    
    def test_group_to_dict_includes_is_view_only(self):
        """Test that to_dict includes is_view_only field"""
        group = self.factory.create_group(name="Test Group")
        group.is_view_only = True
        db.session.add(group)
        db.session.commit()
        
        group_dict = group.to_dict()
        self.assertIn('is_view_only', group_dict)
        self.assertTrue(group_dict['is_view_only'])


class TestViewOnlyPermissions(BaseTestCase):
    def setUp(self):
        super(TestViewOnlyPermissions, self).setUp()
        # Create a view-only group
        self.view_only_group = self.factory.create_group(name="View Only Group")
        self.view_only_group.is_view_only = True
        db.session.add(self.view_only_group)
        
        # Create a regular group
        self.regular_group = self.factory.create_group(name="Regular Group")
        self.regular_group.is_view_only = False
        db.session.add(self.regular_group)
        
        # Create users
        self.view_only_user = self.factory.create_user(
            email="viewonly@example.com",
            group_ids=[self.view_only_group.id]
        )
        self.regular_user = self.factory.create_user(
            email="regular@example.com", 
            group_ids=[self.regular_group.id]
        )
        self.mixed_user = self.factory.create_user(
            email="mixed@example.com",
            group_ids=[self.view_only_group.id, self.regular_group.id]
        )
        
        db.session.commit()
    
    def test_can_view_query_source_for_regular_user(self):
        """Regular users can view query source"""
        from redash.permissions import can_view_query_source
        self.assertTrue(can_view_query_source(self.regular_user))
    
    def test_cannot_view_query_source_for_view_only_user(self):
        """View-only users cannot view query source"""
        from redash.permissions import can_view_query_source
        self.assertFalse(can_view_query_source(self.view_only_user))
    
    def test_can_view_query_source_for_mixed_user(self):
        """Users in both regular and view-only groups can view query source (regular takes precedence)"""
        from redash.permissions import can_view_query_source
        self.assertTrue(can_view_query_source(self.mixed_user))
    
    def test_can_download_results_for_regular_user(self):
        """Regular users can download results"""
        from redash.permissions import can_download_results
        self.assertTrue(can_download_results(self.regular_user))
    
    def test_cannot_download_results_for_view_only_user(self):
        """View-only users cannot download results"""
        from redash.permissions import can_download_results
        self.assertFalse(can_download_results(self.view_only_user))
    
    def test_can_create_alert_for_regular_user(self):
        """Regular users can create alerts"""
        from redash.permissions import can_create_alert
        self.assertTrue(can_create_alert(self.regular_user))
    
    def test_cannot_create_alert_for_view_only_user(self):
        """View-only users cannot create alerts"""
        from redash.permissions import can_create_alert
        self.assertFalse(can_create_alert(self.view_only_user))


class TestViewOnlyAPIEndpoints(BaseTestCase):
    def setUp(self):
        super(TestViewOnlyAPIEndpoints, self).setUp()
        # Create a view-only group with view_query permission
        self.view_only_group = self.factory.create_group(name="View Only Group")
        self.view_only_group.is_view_only = True
        self.view_only_group.permissions = ["view_query", "execute_query", "list_dashboards", "list_data_sources"]
        db.session.add(self.view_only_group)
        
        # Create a regular group with full permissions
        self.regular_group = self.factory.create_group(name="Regular Group")
        self.regular_group.is_view_only = False
        self.regular_group.permissions = models.Group.DEFAULT_PERMISSIONS
        db.session.add(self.regular_group)
        
        # Commit groups before creating users
        db.session.commit()
        
        # Create users with proper group assignments
        self.view_only_user = self.factory.create_user(
            email="viewonly@example.com",
            group_ids=[self.view_only_group.id]
        )
        self.regular_user = self.factory.create_user(
            email="regular@example.com", 
            group_ids=[self.regular_group.id]
        )
        
        # Add groups to the data source before creating the query
        self.factory.data_source.add_group(self.view_only_group, view_only=True)
        self.factory.data_source.add_group(self.regular_group, view_only=False)
        db.session.commit()
        
        # Create a query
        self.query = self.factory.create_query(
            query_text="SELECT * FROM users WHERE id = 1",
            name="Test Query",
            description="Test Description"
        )
        
        db.session.commit()
    
    def test_serialize_query_hides_sql_for_view_only_user(self):
        """View-only users should not see SQL in serialized queries"""
        from redash.serializers import serialize_query
        from flask_login import login_user
        
        # Mock the current user as view-only user
        with self.app.test_request_context():
            login_user(self.view_only_user)
            serialized = serialize_query(self.query)
            self.assertNotIn("query", serialized)
            self.assertIn("id", serialized)
            self.assertIn("name", serialized)
    
    def test_serialize_query_shows_sql_for_regular_user(self):
        """Regular users should see SQL in serialized queries"""
        from redash.serializers import serialize_query
        from flask_login import login_user
        
        # Mock the current user as regular user
        with self.app.test_request_context():
            login_user(self.regular_user)
            serialized = serialize_query(self.query)
            self.assertIn("query", serialized)
            self.assertEqual(serialized["query"], "SELECT * FROM users WHERE id = 1")
    
    def test_query_api_hides_sql_for_view_only_user(self):
        """Query API should not return SQL for view-only users"""
        rv = self.make_request('get', f'/api/queries/{self.query.id}', user=self.view_only_user)
        self.assertEqual(rv.status_code, 200)
        self.assertNotIn("query", rv.json)
        self.assertIn("id", rv.json)
        self.assertIn("name", rv.json)
    
    def test_query_api_shows_sql_for_regular_user(self):
        """Query API should return SQL for regular users"""
        rv = self.make_request('get', f'/api/queries/{self.query.id}', user=self.regular_user)
        self.assertEqual(rv.status_code, 200)
        self.assertIn("query", rv.json)
        self.assertEqual(rv.json["query"], "SELECT * FROM users WHERE id = 1")


class TestViewOnlyGroupManagementAPI(BaseTestCase):
    def setUp(self):
        super(TestViewOnlyGroupManagementAPI, self).setUp()
        self.admin_user = self.factory.create_admin()
        
    def test_create_view_only_group(self):
        """Admin can create a view-only group"""
        rv = self.make_request(
            'post', 
            '/api/groups',
            data={'name': 'View Only Group', 'is_view_only': True},
            user=self.admin_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], 'View Only Group')
        self.assertTrue(rv.json['is_view_only'])
        
        # Verify in database
        group = models.Group.query.get(rv.json['id'])
        self.assertTrue(group.is_view_only)
    
    def test_create_regular_group(self):
        """Admin can create a regular group"""
        rv = self.make_request(
            'post', 
            '/api/groups',
            data={'name': 'Regular Group', 'is_view_only': False},
            user=self.admin_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], 'Regular Group')
        self.assertFalse(rv.json['is_view_only'])
    
    def test_update_group_view_only_status(self):
        """Admin can update a group's view-only status"""
        group = self.factory.create_group(name="Test Group")
        group.is_view_only = False
        db.session.add(group)
        db.session.commit()
        
        # Update to view-only
        rv = self.make_request(
            'post',
            f'/api/groups/{group.id}',
            data={'name': 'Test Group', 'is_view_only': True},
            user=self.admin_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertTrue(rv.json['is_view_only'])
        
        # Verify in database
        group = models.Group.query.get(group.id)
        self.assertTrue(group.is_view_only)
    
    def test_cannot_modify_builtin_group_view_only_status(self):
        """Cannot modify built-in groups"""
        # Try to modify the default group
        rv = self.make_request(
            'post',
            f'/api/groups/{self.factory.default_group.id}',
            data={'name': 'Default', 'is_view_only': True},
            user=self.admin_user
        )
        self.assertEqual(rv.status_code, 400)
        self.assertIn("Can't modify built-in groups", rv.json['message'])
    
    def test_non_admin_cannot_create_group(self):
        """Non-admin users cannot create groups"""
        regular_user = self.factory.create_user()
        rv = self.make_request(
            'post',
            '/api/groups',
            data={'name': 'Test Group', 'is_view_only': True},
            user=regular_user
        )
        self.assertEqual(rv.status_code, 403)


class TestViewOnlyAdditionalRestrictions(BaseTestCase):
    def setUp(self):
        super(TestViewOnlyAdditionalRestrictions, self).setUp()
        # Create a view-only group with view_query permission
        self.view_only_group = self.factory.create_group(name="View Only Group")
        self.view_only_group.is_view_only = True
        self.view_only_group.permissions = ["view_query", "execute_query", "list_dashboards", "list_data_sources"]
        db.session.add(self.view_only_group)
        
        # Create a regular group with full permissions
        self.regular_group = self.factory.create_group(name="Regular Group")
        self.regular_group.is_view_only = False
        self.regular_group.permissions = models.Group.DEFAULT_PERMISSIONS
        db.session.add(self.regular_group)
        
        db.session.commit()
        
        # Add groups to the data source
        self.factory.data_source.add_group(self.view_only_group, view_only=True)
        self.factory.data_source.add_group(self.regular_group, view_only=False)
        db.session.commit()
        
        # Create users
        self.view_only_user = self.factory.create_user(
            email="viewonly@example.com",
            group_ids=[self.view_only_group.id]
        )
        self.regular_user = self.factory.create_user(
            email="regular@example.com", 
            group_ids=[self.regular_group.id]
        )
        
        # Create a query with results
        self.query = self.factory.create_query(
            query_text="SELECT * FROM users WHERE id = 1",
            name="Test Query",
            data_source=self.factory.data_source
        )
        self.query_result = self.factory.create_query_result(
            query_text=self.query.query_text,
            data_source=self.factory.data_source
        )
        self.query.latest_query_data_id = self.query_result.id
        db.session.add(self.query)
        db.session.commit()
    
    def test_view_only_user_cannot_download_csv(self):
        """View-only users should not be able to download CSV results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.csv',
            user=self.view_only_user
        )
        self.assertEqual(rv.status_code, 403)
    
    def test_view_only_user_cannot_download_xlsx(self):
        """View-only users should not be able to download Excel results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.xlsx',
            user=self.view_only_user
        )
        self.assertEqual(rv.status_code, 403)
    
    def test_view_only_user_cannot_download_tsv(self):
        """View-only users should not be able to download TSV results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.tsv',
            user=self.view_only_user
        )
        self.assertEqual(rv.status_code, 403)
    
    def test_view_only_user_can_get_json_results(self):
        """View-only users should be able to get JSON results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.json',
            user=self.view_only_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertIn("query_result", rv.json)
    
    def test_regular_user_can_download_csv(self):
        """Regular users should be able to download CSV results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.csv',
            user=self.regular_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.headers['Content-Type'], 'text/csv; charset=UTF-8')
    
    def test_regular_user_can_download_xlsx(self):
        """Regular users should be able to download Excel results"""
        rv = self.make_request(
            'get', 
            f'/api/queries/{self.query.id}/results/{self.query_result.id}.xlsx',
            user=self.regular_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.headers['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    def test_view_only_user_cannot_create_alert(self):
        """View-only users should not be able to create alerts"""
        rv = self.make_request(
            'post',
            '/api/alerts',
            data={
                'name': 'Test Alert',
                'query_id': self.query.id,
                'options': {}
            },
            user=self.view_only_user
        )
        self.assertEqual(rv.status_code, 403)
    
    def test_regular_user_can_create_alert(self):
        """Regular users should be able to create alerts"""
        rv = self.make_request(
            'post',
            '/api/alerts',
            data={
                'name': 'Test Alert',
                'query_id': self.query.id,
                'options': {}
            },
            user=self.regular_user
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], 'Test Alert') 