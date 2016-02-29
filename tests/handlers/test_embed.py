from tests import BaseTestCase


class TestEmbedVisualization(BaseTestCase):
    def test_sucesss(self):
        vis = self.factory.create_visualization()
        vis.query.latest_query_data = self.factory.create_query_result()
        vis.query.save()

        res = self.make_request("get", "/embed/query/{}/visualization/{}".format(vis.query.id, vis.id), is_json=False)
        self.assertEqual(res.status_code, 200)
