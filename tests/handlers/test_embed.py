from tests import BaseTestCase


class TestEmbedVisualization(BaseTestCase):
    def test_sucesss(self):
        vis = self.factory.create_visualization()
        vis.query.latest_query_data = self.factory.create_query_result()
        vis.query.save()

        res = self.make_request("get", "/embed/query/{}/visualization/{}".format(vis.query.id, vis.id), is_json=False)
        self.assertEqual(res.status_code, 200)


class TestPublicDashboard(BaseTestCase):
    def test_success(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        res = self.make_request('get', '/public/dashboards/{}'.format(api_key.api_key), user=False, is_json=False)
        self.assertEqual(res.status_code, 200)

    def test_bad_token(self):
        res = self.make_request('get', '/public/dashboards/bad-token', user=False, is_json=False)
        self.assertEqual(res.status_code, 302)

    # Not relevant for now, as tokens in api_keys table are only created for dashboards. Once this changes, we should
    # add this test.
    # def test_token_doesnt_belong_to_dashboard(self):
    #     pass
