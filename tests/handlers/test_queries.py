from tests import BaseTestCase
from redash import models
from redash.models import db

from redash.serializers import serialize_query
from redash.permissions import ACCESS_TYPE_MODIFY


class TestQueryResourceGet(BaseTestCase):
    def test_get_query(self):
        query = self.factory.create_query()

        rv = self.make_request("get", "/api/queries/{0}".format(query.id))

        self.assertEqual(rv.status_code, 200)
        expected = serialize_query(query, with_visualizations=True)
        expected["can_edit"] = True
        expected["is_favorite"] = False
        self.assertResponseEqual(expected, rv.json)

    def test_get_all_queries(self):
        [self.factory.create_query() for _ in range(10)]
        rv = self.make_request("get", "/api/queries")

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(len(rv.json["results"]), 10)

    def test_query_without_data_source_should_be_available_only_by_admin(self):
        query = self.factory.create_query()
        query.data_source = None
        db.session.add(query)

        rv = self.make_request("get", "/api/queries/{}".format(query.id))
        self.assertEqual(rv.status_code, 403)

        rv = self.make_request(
            "get", "/api/queries/{}".format(query.id), user=self.factory.create_admin()
        )
        self.assertEqual(rv.status_code, 200)

    def test_query_only_accessible_to_users_from_its_organization(self):
        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)

        query = self.factory.create_query()
        query.data_source = None
        db.session.add(query)

        rv = self.make_request(
            "get", "/api/queries/{}".format(query.id), user=second_org_admin
        )
        self.assertEqual(rv.status_code, 404)

        rv = self.make_request(
            "get", "/api/queries/{}".format(query.id), user=self.factory.create_admin()
        )
        self.assertEqual(rv.status_code, 200)

    def test_query_search(self):
        names = ["Harder", "Better", "Faster", "Stronger"]
        for name in names:
            self.factory.create_query(name=name)

        rv = self.make_request("get", "/api/queries?q=better")

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(len(rv.json["results"]), 1)

        rv = self.make_request("get", "/api/queries?q=better OR faster")

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(len(rv.json["results"]), 2)

        # test the old search API and that it redirects to the new one
        rv = self.make_request("get", "/api/queries/search?q=stronger")
        self.assertEqual(rv.status_code, 301)
        self.assertIn("/api/queries?q=stronger", rv.headers["Location"])

        rv = self.make_request(
            "get", "/api/queries/search?q=stronger", follow_redirects=True
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(len(rv.json["results"]), 1)


class TestQueryResourcePost(BaseTestCase):
    def test_update_query(self):
        admin = self.factory.create_admin()
        query = self.factory.create_query()

        new_ds = self.factory.create_data_source()
        new_qr = self.factory.create_query_result()

        data = {
            "name": "Testing",
            "query": "select 2",
            "latest_query_data_id": new_qr.id,
            "data_source_id": new_ds.id,
        }

        rv = self.make_request(
            "post", "/api/queries/{0}".format(query.id), data=data, user=admin
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], data["name"])
        self.assertEqual(rv.json["last_modified_by"]["id"], admin.id)
        self.assertEqual(rv.json["query"], data["query"])
        self.assertEqual(rv.json["data_source_id"], data["data_source_id"])
        self.assertEqual(rv.json["latest_query_data_id"], data["latest_query_data_id"])

    def test_raises_error_in_case_of_conflict(self):
        q = self.factory.create_query()
        q.name = "Another Name"
        db.session.add(q)

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(q.id),
            data={"name": "Testing", "version": q.version - 1},
            user=self.factory.user,
        )
        self.assertEqual(rv.status_code, 409)

    def test_allows_association_with_authorized_dropdown_queries(self):
        data_source = self.factory.create_data_source(group=self.factory.default_group)

        other_query = self.factory.create_query(data_source=data_source)
        db.session.add(other_query)

        my_query = self.factory.create_query(data_source=data_source)
        db.session.add(my_query)

        options = {
            "parameters": [
                {"name": "foo", "type": "query", "queryId": other_query.id},
                {"name": "bar", "type": "query", "queryId": other_query.id},
            ]
        }

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(my_query.id),
            data={"options": options},
            user=self.factory.user,
        )
        self.assertEqual(rv.status_code, 200)

    def test_prevents_association_with_unauthorized_dropdown_queries(self):
        other_data_source = self.factory.create_data_source(
            group=self.factory.create_group()
        )
        other_query = self.factory.create_query(data_source=other_data_source)
        db.session.add(other_query)

        my_data_source = self.factory.create_data_source(
            group=self.factory.create_group()
        )
        my_query = self.factory.create_query(data_source=my_data_source)
        db.session.add(my_query)

        options = {"parameters": [{"type": "query", "queryId": other_query.id}]}

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(my_query.id),
            data={"options": options},
            user=self.factory.user,
        )
        self.assertEqual(rv.status_code, 403)

    def test_prevents_association_with_non_existing_dropdown_queries(self):
        my_data_source = self.factory.create_data_source(
            group=self.factory.create_group()
        )
        my_query = self.factory.create_query(data_source=my_data_source)
        db.session.add(my_query)

        options = {"parameters": [{"type": "query", "queryId": 100000}]}

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(my_query.id),
            data={"options": options},
            user=self.factory.user,
        )
        self.assertEqual(rv.status_code, 400)

    def test_overrides_existing_if_no_version_specified(self):
        q = self.factory.create_query()
        q.name = "Another Name"
        db.session.add(q)

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(q.id),
            data={"name": "Testing"},
            user=self.factory.user,
        )
        self.assertEqual(rv.status_code, 200)

    def test_works_for_non_owner_with_permission(self):
        query = self.factory.create_query()
        user = self.factory.create_user()

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(query.id),
            data={"name": "Testing"},
            user=user,
        )
        self.assertEqual(rv.status_code, 403)

        models.AccessPermission.grant(
            obj=query, access_type=ACCESS_TYPE_MODIFY, grantee=user, grantor=query.user
        )

        rv = self.make_request(
            "post",
            "/api/queries/{0}".format(query.id),
            data={"name": "Testing"},
            user=user,
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "Testing")
        self.assertEqual(rv.json["last_modified_by"]["id"], user.id)


class TestQueryListResourceGet(BaseTestCase):
    def test_returns_queries(self):
        q1 = self.factory.create_query()
        q2 = self.factory.create_query()
        q3 = self.factory.create_query()

        rv = self.make_request("get", "/api/queries")

        assert len(rv.json["results"]) == 3
        assert set([result["id"] for result in rv.json["results"]]) == set(
            [q1.id, q2.id, q3.id]
        )

    def test_filters_with_tags(self):
        q1 = self.factory.create_query(tags=["test"])
        self.factory.create_query()
        self.factory.create_query()

        rv = self.make_request("get", "/api/queries?tags=test")
        assert len(rv.json["results"]) == 1
        assert set([result["id"] for result in rv.json["results"]]) == set([q1.id])

    def test_search_term(self):
        q1 = self.factory.create_query(name="Sales")
        q2 = self.factory.create_query(name="Q1 sales")
        self.factory.create_query(name="Ops")

        rv = self.make_request("get", "/api/queries?q=sales")
        assert len(rv.json["results"]) == 2
        assert set([result["id"] for result in rv.json["results"]]) == set(
            [q1.id, q2.id]
        )


class TestQueryListResourcePost(BaseTestCase):
    def test_create_query(self):
        query_data = {
            "name": "Testing",
            "query": "SELECT 1",
            "schedule": {"interval": "3600"},
            "data_source_id": self.factory.data_source.id,
        }

        rv = self.make_request("post", "/api/queries", data=query_data)

        self.assertEqual(rv.status_code, 200)
        self.assertDictContainsSubset(query_data, rv.json)
        self.assertEqual(rv.json["user"]["id"], self.factory.user.id)
        self.assertIsNotNone(rv.json["api_key"])
        self.assertIsNotNone(rv.json["query_hash"])

        query = models.Query.query.get(rv.json["id"])
        self.assertEqual(len(list(query.visualizations)), 1)
        self.assertTrue(query.is_draft)

    def test_allows_association_with_authorized_dropdown_queries(self):
        data_source = self.factory.create_data_source(group=self.factory.default_group)

        other_query = self.factory.create_query(data_source=data_source)
        db.session.add(other_query)

        query_data = {
            "name": "Testing",
            "query": "SELECT 1",
            "schedule": {"interval": "3600"},
            "data_source_id": self.factory.data_source.id,
            "options": {
                "parameters": [
                    {"name": "foo", "type": "query", "queryId": other_query.id},
                    {"name": "bar", "type": "query", "queryId": other_query.id},
                ]
            },
        }

        rv = self.make_request("post", "/api/queries", data=query_data)
        self.assertEqual(rv.status_code, 200)

    def test_prevents_association_with_unauthorized_dropdown_queries(self):
        other_data_source = self.factory.create_data_source(
            group=self.factory.create_group()
        )
        other_query = self.factory.create_query(data_source=other_data_source)
        db.session.add(other_query)

        my_data_source = self.factory.create_data_source(
            group=self.factory.create_group()
        )

        query_data = {
            "name": "Testing",
            "query": "SELECT 1",
            "schedule": {"interval": "3600"},
            "data_source_id": my_data_source.id,
            "options": {"parameters": [{"type": "query", "queryId": other_query.id}]},
        }

        rv = self.make_request("post", "/api/queries", data=query_data)
        self.assertEqual(rv.status_code, 403)

    def test_prevents_association_with_non_existing_dropdown_queries(self):
        query_data = {
            "name": "Testing",
            "query": "SELECT 1",
            "schedule": {"interval": "3600"},
            "data_source_id": self.factory.data_source.id,
            "options": {"parameters": [{"type": "query", "queryId": 100000}]},
        }

        rv = self.make_request("post", "/api/queries", data=query_data)
        self.assertEqual(rv.status_code, 400)


class TestQueryArchiveResourceGet(BaseTestCase):
    def test_returns_queries(self):
        q1 = self.factory.create_query(is_archived=True)
        q2 = self.factory.create_query(is_archived=True)
        self.factory.create_query()

        rv = self.make_request("get", "/api/queries/archive")

        assert len(rv.json["results"]) == 2
        assert set([result["id"] for result in rv.json["results"]]) == set(
            [q1.id, q2.id]
        )

    def test_search_term(self):
        q1 = self.factory.create_query(name="Sales", is_archived=True)
        q2 = self.factory.create_query(name="Q1 sales", is_archived=True)
        self.factory.create_query(name="Q2 sales")

        rv = self.make_request("get", "/api/queries/archive?q=sales")
        assert len(rv.json["results"]) == 2
        assert set([result["id"] for result in rv.json["results"]]) == set(
            [q1.id, q2.id]
        )


class QueryRefreshTest(BaseTestCase):
    def setUp(self):
        super(QueryRefreshTest, self).setUp()

        self.query = self.factory.create_query()
        self.path = "/api/queries/{}/refresh".format(self.query.id)

    def test_refresh_regular_query(self):
        response = self.make_request("post", self.path)
        self.assertEqual(200, response.status_code)

    def test_refresh_of_query_with_parameters(self):
        self.query.query_text = "SELECT {{param}}"
        db.session.add(self.query)

        response = self.make_request("post", "{}?p_param=1".format(self.path))
        self.assertEqual(200, response.status_code)

    def test_refresh_of_query_with_parameters_without_parameters(self):
        self.query.query_text = "SELECT {{param}}"
        db.session.add(self.query)

        response = self.make_request("post", "{}".format(self.path))
        self.assertEqual(400, response.status_code)

    def test_refresh_query_you_dont_have_access_to(self):
        group = self.factory.create_group()
        db.session.add(group)
        db.session.commit()
        user = self.factory.create_user(group_ids=[group.id])
        response = self.make_request("post", self.path, user=user)
        self.assertEqual(403, response.status_code)

    def test_refresh_forbiden_with_query_api_key(self):
        response = self.make_request(
            "post", "{}?api_key={}".format(self.path, self.query.api_key), user=False
        )
        self.assertEqual(403, response.status_code)

        response = self.make_request(
            "post",
            "{}?api_key={}".format(self.path, self.factory.user.api_key),
            user=False,
        )
        self.assertEqual(200, response.status_code)


class TestQueryRegenerateApiKey(BaseTestCase):
    def test_non_admin_cannot_regenerate_api_key_of_other_user(self):
        query_creator = self.factory.create_user()
        query = self.factory.create_query(user=query_creator)
        other_user = self.factory.create_user()
        orig_api_key = query.api_key

        rv = self.make_request(
            "post",
            "/api/queries/{}/regenerate_api_key".format(query.id),
            user=other_user,
        )
        self.assertEqual(rv.status_code, 403)

        reloaded_query = models.Query.query.get(query.id)
        self.assertEqual(orig_api_key, reloaded_query.api_key)

    def test_admin_can_regenerate_api_key_of_other_user(self):
        query_creator = self.factory.create_user()
        query = self.factory.create_query(user=query_creator)
        admin_user = self.factory.create_admin()
        orig_api_key = query.api_key

        rv = self.make_request(
            "post",
            "/api/queries/{}/regenerate_api_key".format(query.id),
            user=admin_user,
        )
        self.assertEqual(rv.status_code, 200)

        reloaded_query = models.Query.query.get(query.id)
        self.assertNotEqual(orig_api_key, reloaded_query.api_key)

    def test_admin_can_regenerate_api_key_of_myself(self):
        query_creator = self.factory.create_user()
        admin_user = self.factory.create_admin()
        query = self.factory.create_query(user=query_creator)
        orig_api_key = query.api_key

        rv = self.make_request(
            "post",
            "/api/queries/{}/regenerate_api_key".format(query.id),
            user=admin_user,
        )
        self.assertEqual(rv.status_code, 200)

        updated_query = models.Query.query.get(query.id)
        self.assertNotEqual(orig_api_key, updated_query.api_key)

    def test_user_can_regenerate_api_key_of_myself(self):
        user = self.factory.create_user()
        query = self.factory.create_query(user=user)
        orig_api_key = query.api_key

        rv = self.make_request(
            "post", "/api/queries/{}/regenerate_api_key".format(query.id), user=user
        )
        self.assertEqual(rv.status_code, 200)

        updated_query = models.Query.query.get(query.id)
        self.assertNotEqual(orig_api_key, updated_query.api_key)


class TestQueryForkResourcePost(BaseTestCase):
    def test_forks_a_query(self):
        ds = self.factory.create_data_source(
            group=self.factory.org.default_group, view_only=False
        )
        query = self.factory.create_query(data_source=ds)

        rv = self.make_request("post", "/api/queries/{}/fork".format(query.id))

        self.assertEqual(rv.status_code, 200)

    def test_must_have_full_access_to_data_source(self):
        ds = self.factory.create_data_source(
            group=self.factory.org.default_group, view_only=True
        )
        query = self.factory.create_query(data_source=ds)

        rv = self.make_request("post", "/api/queries/{}/fork".format(query.id))

        self.assertEqual(rv.status_code, 403)


class TestFormatSQLQueryAPI(BaseTestCase):
    def test_format_sql_query(self):
        admin = self.factory.create_admin()
        query = "select a,b,c FROM foobar Where x=1 and y=2;"
        expected = """SELECT a,
       b,
       c
FROM foobar
WHERE x=1
  AND y=2;"""

        rv = self.make_request(
            "post", "/api/queries/format", user=admin, data={"query": query}
        )

        self.assertEqual(rv.json["query"], expected)
