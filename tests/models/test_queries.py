from tests import BaseTestCase
from redash.models import Query


class TestApiKeyGetByObject(BaseTestCase):

    def assert_visualizations(self, origin_q, origin_v, forked_q, forked_v):
        self.assertEqual(origin_v.options, forked_v.options)
        self.assertEqual(origin_v.type, forked_v.type)
        self.assertNotEqual(origin_v.id, forked_v.id)
        self.assertNotEqual(origin_v.query, forked_v.query)
        self.assertEqual(forked_q.id, forked_v.query.id)


    def test_fork_with_visualizations(self):
        # prepare original query and visualizations
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source, description="this is description")
        visualization_chart = self.factory.create_visualization(query=query, description="chart vis", type="CHART", options="""{"yAxis": [{"type": "linear"}, {"type": "linear", "opposite": true}], "series": {"stacking": null}, "globalSeriesType": "line", "sortX": true, "seriesOptions": {"count": {"zIndex": 0, "index": 0, "type": "line", "yAxis": 0}}, "xAxis": {"labels": {"enabled": true}, "type": "datetime"}, "columnMapping": {"count": "y", "created_at": "x"}, "bottomMargin": 50, "legend": {"enabled": true}}""")
        visualization_box = self.factory.create_visualization(query=query, description="box vis", type="BOXPLOT", options="{}")
        fork_user = self.factory.create_user()

        forked_query = Query.fork(query.id, fork_user, self.factory.org)

        forked_visualization_chart = None
        forked_visualization_box = None
        forked_table = None
        count_table = 0
        for v in forked_query.visualizations:
            if v.description == "chart vis":
                forked_visualization_chart = v
            if v.description == "box vis":
                forked_visualization_box = v
            if v.type == "TABLE":
                count_table += 1
                forked_table = v
        self.assert_visualizations(query, visualization_chart, forked_query, forked_visualization_chart)
        self.assert_visualizations(query, visualization_box, forked_query, forked_visualization_box)

        self.assertEqual(forked_query.org, query.org)
        self.assertEqual(forked_query.data_source, query.data_source)
        self.assertEqual(forked_query.latest_query_data, query.latest_query_data)
        self.assertEqual(forked_query.description, query.description)
        self.assertEqual(forked_query.query, query.query)
        self.assertEqual(forked_query.query_hash, query.query_hash)
        self.assertEqual(forked_query.user, fork_user)
        self.assertEqual(forked_query.description, query.description)
        self.assertTrue(forked_query.name.startswith('Copy'))
        # num of TABLE must be 1. default table only
        self.assertEqual(count_table, 1)
        self.assertEqual(forked_table.name, "Table")
        self.assertEqual(forked_table.description, "")
        self.assertEqual(forked_table.options, "{}")
<<<<<<< HEAD
=======

    def test_fork_from_query_that_has_no_visualization(self):
        # prepare original query and visualizations
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source, description="this is description")
        fork_user = self.factory.create_user()

        forked_query = Query.fork(query.id, fork_user, self.factory.org)

        count_table = 0
        count_vis = 0
        for v in forked_query.visualizations:
            count_vis += 1
            if v.type == "TABLE":
                count_table += 1

        self.assertEqual(count_table, 1)
        self.assertEqual(count_vis, 1)
>>>>>>> fix bugs
