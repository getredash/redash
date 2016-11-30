from redash import models
from tests import BaseTestCase


class TestUserListResourcePost(BaseTestCase):
    def test_returns_403_for_non_admin(self):
        rv = self.make_request('post', "/api/users")
        self.assertEqual(rv.status_code, 403)

    def test_returns_400_when_missing_fields(self):
        admin = self.factory.create_admin()

        rv = self.make_request('post', "/api/users", user=admin)
        self.assertEqual(rv.status_code, 400)

        rv = self.make_request('post', '/api/users', data={'name': 'User'}, user=admin)
        self.assertEqual(rv.status_code, 400)

    def test_creates_user(self):
        admin = self.factory.create_admin()

        test_user = {'name': 'User', 'email': 'user@example.com', 'password': 'test'}
        rv = self.make_request('post', '/api/users', data=test_user, user=admin)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], test_user['name'])
        self.assertEqual(rv.json['email'], test_user['email'])

    def test_returns_400_when_email_taken(self):
        admin = self.factory.create_admin()

        test_user = {'name': 'User', 'email': admin.email, 'password': 'test'}
        rv = self.make_request('post', '/api/users', data=test_user, user=admin)

        self.assertEqual(rv.status_code, 400)


class TestUserListGet(BaseTestCase):
    def test_returns_users_for_given_org_only(self):
        user1 = self.factory.user
        user2 = self.factory.create_user()
        org = self.factory.create_org()
        user3 = self.factory.create_user(org=org)

        rv = self.make_request('get', "/api/users")
        user_ids = map(lambda u: u['id'], rv.json)
        self.assertIn(user1.id, user_ids)
        self.assertIn(user2.id, user_ids)
        self.assertNotIn(user3.id, user_ids)


class TestUserResourceGet(BaseTestCase):
    def test_returns_api_key_for_your_own_user(self):
        rv = self.make_request('get', "/api/users/{}".format(self.factory.user.id))
        self.assertIn('api_key', rv.json)

    def test_returns_api_key_for_other_user_when_admin(self):
        other_user = self.factory.user
        admin = self.factory.create_admin()

        rv = self.make_request('get', "/api/users/{}".format(other_user.id), user=admin)
        self.assertIn('api_key', rv.json)

    def test_doesnt_return_api_key_for_other_user(self):
        other_user = self.factory.create_user()

        rv = self.make_request('get', "/api/users/{}".format(other_user.id))
        self.assertNotIn('api_key', rv.json)

    def test_doesnt_return_user_from_different_org(self):
        org = self.factory.create_org()
        other_user = self.factory.create_user(org=org)

        rv = self.make_request('get', "/api/users/{}".format(other_user.id))
        self.assertEqual(rv.status_code, 404)


class TestUserResourcePost(BaseTestCase):
    def test_returns_403_for_non_admin_changing_not_his_own(self):
        other_user = self.factory.create_user()

        rv = self.make_request('post', "/api/users/{}".format(other_user.id), data={"name": "New Name"})
        self.assertEqual(rv.status_code, 403)

    def test_returns_200_for_non_admin_changing_his_own(self):
        rv = self.make_request('post', "/api/users/{}".format(self.factory.user.id), data={"name": "New Name"})
        self.assertEqual(rv.status_code, 200)

    def test_returns_200_for_admin_changing_other_user(self):
        admin = self.factory.create_admin()

        rv = self.make_request('post', "/api/users/{}".format(self.factory.user.id), data={"name": "New Name"}, user=admin)
        self.assertEqual(rv.status_code, 200)

    def test_fails_password_change_without_old_password(self):
        rv = self.make_request('post', "/api/users/{}".format(self.factory.user.id), data={"password": "new password"})
        self.assertEqual(rv.status_code, 403)

    def test_fails_password_change_with_incorrect_old_password(self):
        rv = self.make_request('post', "/api/users/{}".format(self.factory.user.id), data={"password": "new password", "old_password": "wrong"})
        self.assertEqual(rv.status_code, 403)

    def test_changes_password(self):
        new_password = "new password"
        old_password = "old password"

        self.factory.user.hash_password(old_password)
        models.db.session.add(self.factory.user)

        rv = self.make_request('post', "/api/users/{}".format(self.factory.user.id), data={"password": new_password, "old_password": old_password})
        self.assertEqual(rv.status_code, 200)

        user = models.User.query.get(self.factory.user.id)
        self.assertTrue(user.verify_password(new_password))
