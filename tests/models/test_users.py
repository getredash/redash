from tests import BaseTestCase, authenticated_user

from redash import redis_connection
from redash.models import User, db
from redash.utils import dt_from_timestamp
from redash.models.users import (
    sync_last_active_at,
    update_user_active_at,
    LAST_ACTIVE_KEY,
)


class TestUserUpdateGroupAssignments(BaseTestCase):
    def test_default_group_always_added(self):
        user = self.factory.create_user()

        user.update_group_assignments(["g_unknown"])
        db.session.refresh(user)

        self.assertCountEqual([user.org.default_group.id], user.group_ids)

    def test_update_group_assignments(self):
        user = self.factory.user
        new_group = self.factory.create_group(name="g1")

        user.update_group_assignments(["g1"])
        db.session.refresh(user)

        self.assertCountEqual([user.org.default_group.id, new_group.id], user.group_ids)


class TestUserFindByEmail(BaseTestCase):
    def test_finds_users(self):
        user = self.factory.create_user(email="test@example.com")
        user2 = self.factory.create_user(
            email="test@example.com", org=self.factory.create_org()
        )

        users = User.find_by_email(user.email)
        self.assertIn(user, users)
        self.assertIn(user2, users)

    def test_finds_users_case_insensitive(self):
        user = self.factory.create_user(email="test@example.com")

        users = User.find_by_email("test@EXAMPLE.com")
        self.assertIn(user, users)


class TestUserGetByEmailAndOrg(BaseTestCase):
    def test_get_user_by_email_and_org(self):
        user = self.factory.create_user(email="test@example.com")

        found_user = User.get_by_email_and_org(user.email, user.org)
        self.assertEqual(user, found_user)

    def test_get_user_by_email_and_org_case_insensitive(self):
        user = self.factory.create_user(email="test@example.com")

        found_user = User.get_by_email_and_org("TEST@example.com", user.org)
        self.assertEqual(user, found_user)


class TestUserSearch(BaseTestCase):
    def test_non_unicode_search_string(self):
        user = self.factory.create_user(name="אריק")

        assert user in User.search(User.all(user.org), term="א")


class TestUserRegenerateApiKey(BaseTestCase):
    def test_regenerate_api_key(self):
        user = self.factory.user
        before_api_key = user.api_key
        user.regenerate_api_key()

        # check committed by research
        user = User.query.get(user.id)
        self.assertNotEqual(user.api_key, before_api_key)


class TestUserDetail(BaseTestCase):
    # def setUp(self):
    #     super(TestUserDetail, self).setUp()
    #     # redis_connection.flushdb()

    def test_userdetail_db_default(self):
        with authenticated_user(self.client) as user:
            self.assertEqual(user.details, {})
            self.assertIsNone(user.active_at)

    def test_userdetail_db_default_save(self):
        with authenticated_user(self.client) as user:
            user.details["test"] = 1
            db.session.commit()

            user_reloaded = User.query.filter_by(id=user.id).first()
            self.assertEqual(user.details["test"], 1)
            self.assertEqual(
                user_reloaded,
                User.query.filter(
                    User.details["test"].astext.cast(db.Integer) == 1
                ).first(),
            )

    def test_sync(self):
        with authenticated_user(self.client) as user:
            rv = self.client.get("/default/")
            timestamp = dt_from_timestamp(
                redis_connection.hget(LAST_ACTIVE_KEY, user.id)
            )
            sync_last_active_at()

            user_reloaded = User.query.filter(User.id == user.id).first()
            self.assertIn("active_at", user_reloaded.details)
            self.assertEqual(user_reloaded.active_at, timestamp)
