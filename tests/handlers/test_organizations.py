from funcy import project

from tests import BaseTestCase
from redash.models import Organization, NoResultFound, db

class TestOrganizationResourceList(BaseTestCase):
    def test_list(self):
        user = self.factory.create_admin()
        org = user.org
        db.session.add(user)
        db.session.commit()
        response = self.make_request('get', '/api/organizations', user=user)
        org_keys = ['id', 'name', 'slug', 'settings']

        self.assertEqual(project(response.json[0], org_keys), project(org.to_dict(), org_keys))

class TestOrganizationResourcePut(BaseTestCase):
    def test_allowed_only_to_admin(self):
        user = self.factory.create_user()
        org = user.org
        response = self.make_request('post', '/api/organizations/{}'.format(org.id),
                                     user=user,
                                     data={'name': 'Another Name'})

        self.assertEqual(response.status_code, 403)

    def test_can_save_timezone(self):
        user = self.factory.create_admin()
        org = user.org
        response = self.make_request('post', '/api/organizations/{}'.format(org.id),
                                     user=user,
                                     data={'settings': { 'timezone': 'UTC' }})

        saved = Organization.query.get(org.id)

        self.assertEqual(saved.settings['timezone'], 'UTC')
        self.assertEqual(response.status_code, 200)


