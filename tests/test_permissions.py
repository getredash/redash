from collections import namedtuple
from tests import BaseTestCase
from redash.permissions import has_access
from redash.models import db
MockUser = namedtuple('MockUser', ['permissions', 'groups'])
view_only = True


class TestHasAccess(BaseTestCase):
    def setUp(self):
        BaseTestCase.setUp(self)
        db.session.flush()

    def test_allows_admin_regardless_of_groups(self):
        user = MockUser(['admin'], [])

        self.assertTrue(has_access({}, user, view_only))
        self.assertTrue(has_access({}, user, not view_only))

    def test_allows_if_user_member_in_group_with_view_access(self):
        user = MockUser([], [self.factory.default_group])

        self.assertTrue(has_access({self.factory.default_group.id: view_only},
                                   user, view_only))

    def test_allows_if_user_member_in_group_with_full_access(self):
        user = MockUser([], [self.factory.default_group])

        self.assertTrue(has_access({self.factory.default_group.id: not view_only},
                                   user, not view_only))

    def test_allows_if_user_member_in_multiple_groups(self):
        user = MockUser([], [self.factory.default_group,
                             self.factory.admin_group,
                             self.factory.create_group()])

        self.assertTrue(has_access({self.factory.default_group.id: not view_only,
                                    self.factory.admin_group.id: view_only},
                                   user, not view_only))
        self.assertFalse(has_access({self.factory.default_group.id: view_only,
                                     self.factory.admin_group.id: view_only},
                                    user, not view_only))
        self.assertTrue(has_access({self.factory.default_group.id: view_only,
                                    self.factory.admin_group.id: view_only},
                                   user, view_only))
        self.assertTrue(has_access({self.factory.default_group.id: not view_only,
                                    self.factory.admin_group.id: not view_only},
                                   user, view_only))

    def test_not_allows_if_not_enough_permission(self):
        user = MockUser([], [self.factory.default_group])

        self.assertFalse(has_access({self.factory.default_group.id: view_only},
                                    user, not view_only))
        self.assertFalse(has_access({self.factory.admin_group.id: view_only},
                                    user, not view_only))
        self.assertFalse(has_access({self.factory.admin_group.id: view_only},
                                    user, view_only))
        self.assertFalse(has_access({self.factory.admin_group.id: not view_only,
                                     self.factory.default_group.id: view_only},
                                    user, not view_only))
