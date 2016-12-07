from tests import BaseTestCase
from redash.models import db


class TestEmbedVisualization(BaseTestCase):
    def test_sucesss(self):
        vis = self.factory.create_visualization()
        vis.query_rel.latest_query_data = self.factory.create_query_result()
        db.session.add(vis.query_rel)

        res = self.make_request("get", "/embed/query/{}/visualization/{}".format(vis.query_rel.id, vis.id), is_json=False)
        self.assertEqual(res.status_code, 200)

    # TODO: bring back?
    # def test_parameters_on_embeds(self):
    #     previous = settings.ALLOW_PARAMETERS_IN_EMBEDS
    #     # set configuration
    #     settings.ALLOW_PARAMETERS_IN_EMBEDS = True
    #
    #     try:
    #         vis = self.factory.create_visualization_with_params()
    #         param1_name = "param1"
    #         param1_value = "12345"
    #
    #         res = self.make_request("get", "/embed/query/{}/visualization/{}?p_{}={}".format(vis.query.id, vis.id, param1_name, param1_value), is_json=False)
    #
    #         # Currently we are expecting a 503 error which indicates that
    #         # the database is unavailable. This ensures that the code in embed.py
    #         # reaches the point where a DB query is made, where we then fail
    #         # intentionally (because DB connection is not available in the tests).
    #         self.assertEqual(res.status_code, 503)
    #
    #         # run embed query with maxAge to test caching
    #         res = self.make_request("get", "/embed/query/{}/visualization/{}?p_{}={}&maxAge=60".format(vis.query.id, vis.id, param1_name, param1_value), is_json=False)
    #         # If the 'maxAge' parameter is set and the query fails (because DB connection
    #         # is not available in the tests), we're expecting a 404 error here.
    #         self.assertEqual(res.status_code, 404)
    #
    #     finally:
    #         # reset configuration
    #         settings.ALLOW_PARAMETERS_IN_EMBEDS = previous


# TODO: this should be applied to the new API endpoint
class TestPublicDashboard(BaseTestCase):
    def test_success(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        res = self.make_request('get', '/public/dashboards/{}'.format(api_key.api_key), user=False, is_json=False)
        self.assertEqual(res.status_code, 200)

    def test_works_for_logged_in_user(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        res = self.make_request('get', '/public/dashboards/{}'.format(api_key.api_key), is_json=False)
        self.assertEqual(res.status_code, 200)

    def test_bad_token(self):
        res = self.make_request('get', '/public/dashboards/bad-token', user=False, is_json=False)
        self.assertEqual(res.status_code, 302)

    def test_inactive_token(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard, active=False)
        res = self.make_request('get', '/public/dashboards/{}'.format(api_key.api_key), user=False, is_json=False)
        self.assertEqual(res.status_code, 302)

    # Not relevant for now, as tokens in api_keys table are only created for dashboards. Once this changes, we should
    # add this test.
    # def test_token_doesnt_belong_to_dashboard(self):
    #     pass

class TestAPIPublicDashboard(BaseTestCase):
    def test_success(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        res = self.make_request('get', '/api/dashboards/public/{}'.format(api_key.api_key), user=False, is_json=False)
        self.assertEqual(res.status_code, 200)

    def test_works_for_logged_in_user(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        res = self.make_request('get', '/api/dashboards/public/{}'.format(api_key.api_key), is_json=False)
        self.assertEqual(res.status_code, 200)

    def test_bad_token(self):
        res = self.make_request('get', '/api/dashboards/public/bad-token', user=False, is_json=False)
        self.assertEqual(res.status_code, 404)

    def test_inactive_token(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard, active=False)
        res = self.make_request('get', '/api/dashboards/public/{}'.format(api_key.api_key), user=False, is_json=False)
        self.assertEqual(res.status_code, 404)

    # Not relevant for now, as tokens in api_keys table are only created for dashboards. Once this changes, we should
    # add this test.
    # def test_token_doesnt_belong_to_dashboard(self):
    #     pass
