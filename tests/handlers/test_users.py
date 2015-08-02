from tests import BaseTestCase
from tests.factories import user_factory
from tests.handlers import authenticated_user, json_request
from redash.wsgi import app
from redash import models


class TestUserListResourcePost(BaseTestCase):
    def test_returns_403_for_non_admin(self):
        with app.test_client() as c, authenticated_user(c):
            rv = c.post("/api/users")
            self.assertEqual(rv.status_code, 403)

    def test_returns_400_when_missing_fields(self):
        admin = user_factory.create(groups=['admin', 'default'])

        with app.test_client() as c, authenticated_user(c, user=admin):
            rv = c.post("/api/users")
            self.assertEqual(rv.status_code, 400)

            rv = json_request(c.post, '/api/users', data={'name': 'User'})

            self.assertEqual(rv.status_code, 400)

    def test_creates_user(self):
        admin = user_factory.create(groups=['admin', 'default'])

        with app.test_client() as c, authenticated_user(c, user=admin):
            test_user = {'name': 'User', 'email': 'user@example.com', 'password': 'test'}
            rv = json_request(c.post, '/api/users', data=test_user)

            self.assertEqual(rv.status_code, 200)
            self.assertEqual(rv.json['name'], test_user['name'])
            self.assertEqual(rv.json['email'], test_user['email'])


class TestUserResourcePost(BaseTestCase):
    def test_returns_403_for_non_admin_changing_not_his_own(self):
        other_user = user_factory.create()
        with app.test_client() as c, authenticated_user(c):
            rv = c.post("/api/users/{}".format(other_user.id), data={"name": "New Name"})
            self.assertEqual(rv.status_code, 403)

    def test_returns_200_for_non_admin_changing_his_own(self):
        with app.test_client() as c, authenticated_user(c) as user:
            rv = json_request(c.post, "/api/users/{}".format(user.id), data={"name": "New Name"})
            self.assertEqual(rv.status_code, 200)

    def test_returns_200_for_admin_changing_other_user(self):
        admin = user_factory.create(groups=['admin', 'default'])
        user = user_factory.create()

        with app.test_client() as c, authenticated_user(c, user=admin):
            rv = json_request(c.post, "/api/users/{}".format(user.id), data={"name": "New Name"})
            self.assertEqual(rv.status_code, 200)

    def test_fails_password_change_without_old_password(self):
        with app.test_client() as c, authenticated_user(c) as user:
            rv = json_request(c.post, "/api/users/{}".format(user.id), data={"password": "new password"})
            self.assertEqual(rv.status_code, 403)

    def test_fails_password_change_with_incorrect_old_password(self):
        with app.test_client() as c, authenticated_user(c) as user:
            rv = json_request(c.post, "/api/users/{}".format(user.id), data={"password": "new password", "old_password": "wrong"})
            self.assertEqual(rv.status_code, 403)

    def test_changes_password(self):
        new_password = "new password"
        old_password = "old password"
        with app.test_client() as c, authenticated_user(c) as user:
            user.hash_password(old_password)
            user.save()

            rv = json_request(c.post, "/api/users/{}".format(user.id), data={"password": new_password, "old_password": old_password})
            self.assertEqual(rv.status_code, 200)

            user = models.User.get_by_id(user.id)
            self.assertTrue(user.verify_password(new_password))


