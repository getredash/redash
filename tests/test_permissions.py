from tests import BaseTestCase
from collections import namedtuple
from unittest import TestCase
from redash.permissions import has_access
from redash import models


MockUser = namedtuple("MockUser", ["permissions", "group_ids"])
view_only = True


class TestHasAccess(BaseTestCase):
    def test_allows_admin_regardless_of_groups(self):
        user = MockUser(["admin"], [])

        self.assertTrue(has_access({}, user, view_only))
        self.assertTrue(has_access({}, user, not view_only))

    def test_allows_if_user_member_in_group_with_view_access(self):
        user = MockUser([], [1])

        self.assertTrue(has_access({1: view_only}, user, view_only))

    def test_allows_if_user_member_in_group_with_full_access(self):
        user = MockUser([], [1])

        self.assertTrue(has_access({1: not view_only}, user, not view_only))

    def test_allows_if_user_member_in_multiple_groups(self):
        user = MockUser([], [1, 2, 3])

        self.assertTrue(
            has_access({1: not view_only, 2: view_only}, user, not view_only)
        )
        self.assertFalse(has_access({1: view_only, 2: view_only}, user, not view_only))
        self.assertTrue(has_access({1: view_only, 2: view_only}, user, view_only))
        self.assertTrue(
            has_access({1: not view_only, 2: not view_only}, user, view_only)
        )

    def test_not_allows_if_not_enough_permission(self):
        user = MockUser([], [1])

        self.assertFalse(has_access({1: view_only}, user, not view_only))
        self.assertFalse(has_access({2: view_only}, user, not view_only))
        self.assertFalse(has_access({2: view_only}, user, view_only))
        self.assertFalse(
            has_access({2: not view_only, 1: view_only}, user, not view_only)
        )

    def test_allows_access_to_query_by_query_api_key(self):
        query = self.factory.create_query()
        user = models.ApiUser(query.api_key, None, [])

        self.assertTrue(has_access(query, user, view_only))

    def test_doesnt_allow_access_to_query_by_different_api_key(self):
        query = self.factory.create_query()
        other_query = self.factory.create_query()
        user = models.ApiUser(other_query.api_key, None, [])

        self.assertFalse(has_access(query, user, view_only))

    def test_allows_access_to_query_by_dashboard_api_key(self):
        dashboard = self.factory.create_dashboard()
        visualization = self.factory.create_visualization()
        self.factory.create_widget(dashboard=dashboard, visualization=visualization)
        query = self.factory.create_query(visualizations=[visualization])

        api_key = self.factory.create_api_key(object=dashboard).api_key
        user = models.ApiUser(api_key, None, [])

        self.assertTrue(has_access(query, user, view_only))
