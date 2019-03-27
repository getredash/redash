from collections import namedtuple
from unittest import TestCase
from redash.permissions import has_access


MockUser = namedtuple('MockUser', ['permissions', 'group_ids'])
view_only = True


class TestHasAccess(TestCase):
    def test_allows_admin_regardless_of_groups(self):
        user = MockUser(['admin'], [])

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

        self.assertTrue(has_access({1: not view_only, 2: view_only}, user, not view_only))
        self.assertFalse(has_access({1: view_only, 2: view_only}, user, not view_only))
        self.assertTrue(has_access({1: view_only, 2: view_only}, user, view_only))
        self.assertTrue(has_access({1: not view_only, 2: not view_only}, user, view_only))

    def test_not_allows_if_not_enough_permission(self):
        user = MockUser([], [1])

        self.assertFalse(has_access({1: view_only}, user, not view_only))
        self.assertFalse(has_access({2: view_only}, user, not view_only))
        self.assertFalse(has_access({2: view_only}, user, view_only))
        self.assertFalse(has_access({2: not view_only, 1: view_only}, user, not view_only))
