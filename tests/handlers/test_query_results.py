from urllib.parse import quote

from mock import patch

from redash import rq_redis_connection
from redash.handlers.query_results import error_messages, run_query
from redash.models import DataSourceGroup, db
from redash.tasks import Job
from redash.utils import gen_query_hash, json_dumps
from tests import BaseTestCase


class TestRunQuery(BaseTestCase):
    def test_run_query_with_no_data_source(self):
        response, status = run_query(None, None, None, None, None)
        self.assertDictEqual(response, error_messages["no_data_source"][0])
        self.assertEqual(status, error_messages["no_data_source"][1])


class TestQueryResultsCacheHeaders(BaseTestCase):
    def test_uses_cache_headers_for_specific_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query(latest_query_data=query_result)

        rv = self.make_request("get", "/api/queries/{}/results/{}.json".format(query.id, query_result.id))
        self.assertIn("Cache-Control", rv.headers)

    def test_doesnt_use_cache_headers_for_non_specific_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query(latest_query_data=query_result)

        rv = self.make_request("get", "/api/queries/{}/results.json".format(query.id))
        self.assertNotIn("Cache-Control", rv.headers)

    def test_returns_404_if_no_cached_result_found(self):
        query = self.factory.create_query(latest_query_data=None)

        rv = self.make_request("get", "/api/queries/{}/results.json".format(query.id))
        self.assertEqual(404, rv.status_code)


class TestQueryResultsContentDispositionHeaders(BaseTestCase):
    def test_supports_unicode(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query(name="עברית", latest_query_data=query_result)

        rv = self.make_request("get", "/api/queries/{}/results.json".format(query.id))
        # This is what gunicorn will do with it
        try:
            rv.headers["Content-Disposition"].encode("ascii")
        except Exception as e:
            self.fail(repr(e))


class TestQueryResultListAPI(BaseTestCase):
    def test_get_existing_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query.query_text,
            },
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(query_result.id, rv.json["query_result"]["id"])

    def test_execute_new_query(self):
        self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query.query_text,
                "max_age": 0,
            },
        )

        self.assertEqual(rv.status_code, 200)
        self.assertNotIn("query_result", rv.json)
        self.assertIn("job", rv.json)

    def test_add_limit_change_query_sql(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="pg")
        query = self.factory.create_query(query_text="SELECT 2", data_source=ds)
        self.factory.create_query_result(data_source=ds, query_hash=query.query_hash)

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={"data_source_id": ds.id, "query": query.query_text, "apply_auto_limit": True},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertNotIn("query_result", rv.json)
        self.assertIn("job", rv.json)

    def test_add_limit_no_change_for_nonsql(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="prometheus")
        query = self.factory.create_query(query_text="SELECT 5", data_source=ds)
        query_result = self.factory.create_query_result(data_source=ds, query_hash=query.query_hash)

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={"data_source_id": ds.id, "query": query.query_text, "apply_auto_limit": True},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(query_result.id, rv.json["query_result"]["id"])

    def test_execute_query_without_access(self):
        group = self.factory.create_group()
        db.session.commit()
        user = self.factory.create_user(group_ids=[group.id])
        query = self.factory.create_query()

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query.query_text,
                "max_age": 0,
            },
            user=user,
        )

        self.assertEqual(rv.status_code, 403)
        self.assertIn("job", rv.json)

    def test_execute_query_with_params(self):
        query = "SELECT {{param}}"

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query,
                "max_age": 0,
            },
        )

        self.assertEqual(rv.status_code, 400)
        self.assertIn("job", rv.json)

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query,
                "parameters": {"param": 1},
                "max_age": 0,
            },
        )

        self.assertEqual(rv.status_code, 200)
        self.assertIn("job", rv.json)

        rv = self.make_request(
            "post",
            "/api/query_results?p_param=1",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": query,
                "max_age": 0,
            },
        )

        self.assertEqual(rv.status_code, 200)
        self.assertIn("job", rv.json)

    def test_execute_on_paused_data_source(self):
        self.factory.data_source.pause()

        rv = self.make_request(
            "post",
            "/api/query_results",
            data={
                "data_source_id": self.factory.data_source.id,
                "query": "SELECT 1",
                "max_age": 0,
            },
        )

        self.assertEqual(rv.status_code, 400)
        self.assertNotIn("query_result", rv.json)
        self.assertIn("job", rv.json)

    def test_execute_without_data_source(self):
        rv = self.make_request("post", "/api/query_results", data={"query": "SELECT 1", "max_age": 0})

        self.assertEqual(rv.status_code, 401)
        self.assertDictEqual(rv.json, error_messages["select_data_source"][0])


class TestQueryResultAPI(BaseTestCase):
    def test_view_only_query_execution_uses_user_id(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query = self.factory.create_query(data_source=ds, query_text="SELECT 1")
        user = self.factory.user
        email = "*/ SELECT 999; --@example.org"
        rv = self.make_request("post", "/api/users/{}".format(user.id), data={"email": email})
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request(
            "post", "/api/query_results", data={"data_source_id": ds.id, "query": "SELECT 999", "max_age": 0}
        )
        self.assertEqual(rv.status_code, 403)

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id), data={"max_age": 0})
        self.assertEqual(rv.status_code, 200)
        metadata = Job.fetch(rv.json["job"]["id"], connection=rq_redis_connection).args[2]
        self.assertEqual(metadata["user_id"], user.id)

    def test_query_api_execution_uses_query_identity_label(self):
        query = self.factory.create_query(query_text="SELECT 1")
        rv = self.make_request(
            "post",
            "/api/queries/{}/results?api_key={}".format(query.id, query.api_key),
            data={"max_age": 0},
            user=False,
        )
        self.assertEqual(rv.status_code, 200)
        metadata = Job.fetch(rv.json["job"]["id"], connection=rq_redis_connection).args[2]
        self.assertEqual(metadata["user_id"], "<ApiKey: Query {}>".format(query.id))

    def test_has_no_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.create_group())
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request("get", "/api/query_results/{}".format(query_result.id))
        self.assertEqual(rv.status_code, 403)

    def test_has_view_only_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request("get", "/api/query_results/{}".format(query_result.id))
        self.assertEqual(rv.status_code, 200)

    def test_has_full_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=False)
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request("get", "/api/query_results/{}".format(query_result.id))
        self.assertEqual(rv.status_code, 200)

    def test_query_results_ds_denies_access_to_underlying_data_source(self):
        """When a result was produced via the Query Results data source, users
        without access to the underlying data source should be denied."""
        # Create a sensitive data source the default user does NOT have access to
        sensitive_ds = self.factory.create_data_source(group=self.factory.create_group(), type="pg")
        sensitive_query = self.factory.create_query(data_source=sensitive_ds)

        # Create a "Query Results" data source the default user DOES have access to
        qr_ds = self.factory.create_data_source(group=self.factory.org.default_group, type="results")

        # Simulate a cached result produced via the Query Results data source
        # whose SQL references the sensitive query
        query_result = self.factory.create_query_result(
            data_source=qr_ds,
            query_text="SELECT * FROM query_{}".format(sensitive_query.id),
        )

        rv = self.make_request("get", "/api/query_results/{}".format(query_result.id))
        self.assertEqual(rv.status_code, 403)

    def test_query_results_ds_allows_access_when_user_has_underlying_access(self):
        """When a result was produced via the Query Results data source and the
        user has access to all underlying data sources, access should be allowed."""
        # Both data sources accessible to the default user
        underlying_ds = self.factory.create_data_source(group=self.factory.org.default_group, type="pg")
        underlying_query = self.factory.create_query(data_source=underlying_ds)

        qr_ds = self.factory.create_data_source(group=self.factory.org.default_group, type="results")

        query_result = self.factory.create_query_result(
            data_source=qr_ds,
            query_text="SELECT * FROM query_{}".format(underlying_query.id),
        )

        rv = self.make_request("get", "/api/query_results/{}".format(query_result.id))
        self.assertEqual(rv.status_code, 200)

    def test_execute_new_query(self):
        query = self.factory.create_query()

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id), data={"parameters": {}})

        self.assertEqual(rv.status_code, 200)
        self.assertIn("job", rv.json)

    def test_execute_but_has_no_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=ds)

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id))
        self.assertEqual(rv.status_code, 403)
        self.assertDictEqual(rv.json, error_messages["no_permission"][0])

    def test_execute_with_no_parameter_values(self):
        query = self.factory.create_query()

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id))

        self.assertEqual(rv.status_code, 200)
        self.assertIn("job", rv.json)

    def test_prevents_execution_of_unsafe_queries_on_view_only_data_sources(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query = self.factory.create_query(data_source=ds, options={"parameters": [{"name": "foo", "type": "text"}]})

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id), data={"parameters": {}})
        self.assertEqual(rv.status_code, 403)
        self.assertDictEqual(rv.json, error_messages["unsafe_on_view_only"][0])

    def test_allows_execution_of_safe_queries_on_view_only_data_sources(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query = self.factory.create_query(data_source=ds, options={"parameters": [{"name": "foo", "type": "number"}]})

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id), data={"parameters": {}})
        self.assertEqual(rv.status_code, 200)

    def test_prevents_execution_of_undeclared_mustache_parameters(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        for template in ("SELECT {{{value}}}", "SELECT {{&value}}", "SELECT {{^flag}}{{value}}{{/flag}}"):
            query = self.factory.create_query(data_source=ds, query_text=template, options={"parameters": []})
            for use_api_key in (False, True):
                with self.subTest(template=template, use_api_key=use_api_key):
                    url = "/api/queries/{}/results".format(query.id)
                    if use_api_key:
                        url += "?api_key={}".format(query.api_key)
                    with patch("redash.handlers.query_results.enqueue_query") as enqueue:
                        with patch("redash.handlers.query_results.serialize_job", return_value={"job": {}}):
                            rv = self.make_request(
                                "post", url, data={"parameters": {"value": "1 UNION SELECT 2"}, "max_age": 0}
                            )
                    self.assertEqual(rv.status_code, 403)
                    enqueue.assert_not_called()

    def test_allows_declared_range_parameters_with_view_only_access(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        for parameter_type in ("date-range", "datetime-range", "datetime-range-with-seconds"):
            query = self.factory.create_query(
                data_source=ds,
                query_text="SELECT '{{period.start}}', '{{period.end}}'",
                options={"parameters": [{"name": "period", "type": parameter_type}]},
            )
            for use_api_key in (False, True):
                with self.subTest(parameter_type=parameter_type, use_api_key=use_api_key):
                    url = "/api/queries/{}/results".format(query.id)
                    if use_api_key:
                        url += "?api_key={}".format(query.api_key)
                    with patch("redash.handlers.query_results.enqueue_query") as enqueue:
                        with patch("redash.handlers.query_results.serialize_job", return_value={"job": {}}):
                            rv = self.make_request(
                                "post",
                                url,
                                data={
                                    "parameters": {"period": {"start": "2026-01-01", "end": "2026-01-31"}},
                                    "max_age": 0,
                                },
                            )
                    self.assertEqual(rv.status_code, 200)
                    enqueue.assert_called_once()
                    self.assertEqual(enqueue.call_args[0][0], "SELECT '2026-01-01', '2026-01-31'")

    def test_get_latest_query_result_with_apply_auto_limit(self):
        query = self.factory.create_query(
            options={"parameters": [{"name": "foo", "type": "number"}], "apply_auto_limit": True}
        )
        rv = self.make_request(
            "post",
            "/api/queries/{}/results".format(query.id),
            data={"parameters": {}, "apply_auto_limit": True},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertIn("job", rv.json)

    def test_prevents_execution_of_unsafe_queries_using_api_key(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query = self.factory.create_query(data_source=ds, options={"parameters": [{"name": "foo", "type": "text"}]})

        data = {"parameters": {"foo": "bar"}}
        rv = self.make_request(
            "post",
            "/api/queries/{}/results?api_key={}".format(query.id, query.api_key),
            data=data,
        )
        self.assertEqual(rv.status_code, 403)
        self.assertDictEqual(rv.json, error_messages["unsafe_when_shared"][0])

    def test_access_with_query_api_key(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=False)
        query = self.factory.create_query()
        query_result = self.factory.create_query_result(data_source=ds, query_text=query.query_text)

        rv = self.make_request(
            "get",
            "/api/queries/{}/results/{}.json?api_key={}".format(query.id, query_result.id, query.api_key),
            user=False,
        )
        self.assertEqual(rv.status_code, 200)

    def test_access_with_query_api_key_without_query_result_id(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=False)
        query = self.factory.create_query()
        query_result = self.factory.create_query_result(
            data_source=ds, query_text=query.query_text, query_hash=query.query_hash
        )
        query.latest_query_data = query_result

        rv = self.make_request(
            "get",
            "/api/queries/{}/results.json?api_key={}".format(query.id, query.api_key),
            user=False,
        )
        self.assertEqual(rv.status_code, 200)

    def test_query_api_key_and_different_query_result(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=False)
        query = self.factory.create_query(query_text="SELECT 8")
        query_result2 = self.factory.create_query_result(data_source=ds, query_hash="something-different")

        rv = self.make_request(
            "get",
            "/api/queries/{}/results/{}.json?api_key={}".format(query.id, query_result2.id, query.api_key),
            user=False,
        )
        self.assertEqual(rv.status_code, 404)

    def test_signed_in_user_and_different_query_result(self):
        ds2 = self.factory.create_data_source(group=self.factory.org.admin_group, view_only=False)
        query = self.factory.create_query(query_text="SELECT 8")
        query_result2 = self.factory.create_query_result(data_source=ds2, query_hash="something-different")

        rv = self.make_request("get", "/api/queries/{}/results/{}.json".format(query.id, query_result2.id))
        self.assertEqual(rv.status_code, 403)


class TestQueryResultDropdownResource(BaseTestCase):
    def test_checks_for_access_to_the_query(self):
        ds2 = self.factory.create_data_source(group=self.factory.org.admin_group, view_only=False)
        query = self.factory.create_query(data_source=ds2)

        rv = self.make_request("get", "/api/queries/{}/dropdown".format(query.id))

        self.assertEqual(rv.status_code, 403)


class TestQueryDropdownsResource(BaseTestCase):
    def test_prevents_access_if_unassociated_and_doesnt_have_access(self):
        query = self.factory.create_query()
        ds2 = self.factory.create_data_source(group=self.factory.org.admin_group, view_only=False)
        unrelated_dropdown_query = self.factory.create_query(data_source=ds2)

        # unrelated_dropdown_query has not been associated with query
        # user does not have direct access to unrelated_dropdown_query

        rv = self.make_request(
            "get",
            "/api/queries/{}/dropdowns/{}".format(query.id, unrelated_dropdown_query.id),
        )

        self.assertEqual(rv.status_code, 403)

    def test_allows_access_if_unassociated_but_user_has_access(self):
        query = self.factory.create_query()

        query_result = self.factory.create_query_result()
        data = {"rows": [], "columns": [{"name": "whatever"}]}
        query_result = self.factory.create_query_result(data=data)
        unrelated_dropdown_query = self.factory.create_query(latest_query_data=query_result)

        # unrelated_dropdown_query has not been associated with query
        # user has direct access to unrelated_dropdown_query

        rv = self.make_request(
            "get",
            "/api/queries/{}/dropdowns/{}".format(query.id, unrelated_dropdown_query.id),
        )

        self.assertEqual(rv.status_code, 200)

    def test_allows_access_if_associated_and_has_access_to_parent(self):
        query_result = self.factory.create_query_result()
        data = {"rows": [], "columns": [{"name": "whatever"}]}
        query_result = self.factory.create_query_result(data=data)
        dropdown_query = self.factory.create_query(latest_query_data=query_result)

        options = {"parameters": [{"name": "param", "type": "query", "queryId": dropdown_query.id}]}
        query = self.factory.create_query(options=options)

        # dropdown_query has been associated with query
        # user has access to query

        rv = self.make_request("get", "/api/queries/{}/dropdowns/{}".format(query.id, dropdown_query.id))

        self.assertEqual(rv.status_code, 200)

    def test_prevents_access_if_associated_and_doesnt_have_access_to_parent(self):
        ds2 = self.factory.create_data_source(group=self.factory.org.admin_group, view_only=False)
        dropdown_query = self.factory.create_query(data_source=ds2)
        options = {"parameters": [{"name": "param", "type": "query", "queryId": dropdown_query.id}]}
        query = self.factory.create_query(data_source=ds2, options=options)

        # dropdown_query has been associated with query
        # user doesnt have access to either query

        rv = self.make_request("get", "/api/queries/{}/dropdowns/{}".format(query.id, dropdown_query.id))

        self.assertEqual(rv.status_code, 403)


class TestQueryDropdownsResourceAPI(BaseTestCase):
    def create_dropdown_query(self, data_source=None, **kwargs):
        data_source = data_source or self.factory.data_source
        data = {"columns": [{"name": "secret"}], "rows": [{"secret": "restricted value"}]}
        result = self.factory.create_query_result(data_source=data_source, data=data)
        return self.factory.create_query(data_source=data_source, latest_query_data=result, **kwargs)

    def get_dropdown(self, query, dropdown_query, api_key=None):
        # Use a fresh client so no session can mask API-key authorization.
        return self.get_request(
            "/api/queries/{}/dropdowns/{}?api_key={}".format(query.id, dropdown_query.id, api_key or query.api_key),
            org=self.factory.org,
            client=self.app.test_client(),
        )

    def test_query_key_cannot_read_unrelated_query_on_same_data_source(self):
        query = self.factory.create_query()
        dropdown_query = self.create_dropdown_query()

        rv = self.get_dropdown(query, dropdown_query)

        self.assertEqual(rv.status_code, 403)

    def test_query_key_cannot_inherit_shared_view_only_group(self):
        query = self.factory.create_query()
        shared_group = self.factory.create_group()
        target_source = self.factory.create_data_source(group=shared_group, view_only=True)
        db.session.add(DataSourceGroup(group=shared_group, data_source=query.data_source, view_only=True))
        dropdown_query = self.create_dropdown_query(data_source=target_source)

        session_response = self.make_request("get", "/api/queries/{}/dropdowns/{}".format(query.id, dropdown_query.id))
        self.assertEqual(session_response.status_code, 403)

        rv = self.get_dropdown(query, dropdown_query)

        self.assertEqual(rv.status_code, 403)

    def test_query_key_cannot_read_itself_as_an_undeclared_dropdown(self):
        query = self.create_dropdown_query()

        rv = self.get_dropdown(query, query)

        self.assertEqual(rv.status_code, 403)

    def test_query_key_can_read_itself_as_a_declared_dropdown(self):
        query = self.create_dropdown_query()
        query.options = {"parameters": [{"name": "param", "type": "query", "queryId": query.id}]}
        db.session.commit()

        rv = self.get_dropdown(query, query)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [{"name": "restricted value", "value": "restricted value"}])

    def test_query_key_can_read_configured_dropdown_without_shared_groups(self):
        target_source = self.factory.create_data_source(group=self.factory.org.admin_group)
        dropdown_query = self.create_dropdown_query(data_source=target_source)
        query = self.factory.create_query(
            options={"parameters": [{"name": "param", "type": "query", "queryId": dropdown_query.id}]}
        )

        rv = self.get_dropdown(query, dropdown_query)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [{"name": "restricted value", "value": "restricted value"}])

    def test_query_key_cannot_authenticate_as_another_parent_query(self):
        query = self.factory.create_query()
        dropdown_query = self.create_dropdown_query()
        other_query = self.factory.create_query(
            options={"parameters": [{"name": "param", "type": "query", "queryId": dropdown_query.id}]}
        )

        rv = self.get_dropdown(other_query, dropdown_query, api_key=query.api_key)

        self.assertEqual(rv.status_code, 404)

    def test_user_api_key_can_read_unrelated_query_with_access(self):
        query = self.factory.create_query()
        dropdown_query = self.create_dropdown_query()

        rv = self.get_dropdown(query, dropdown_query, api_key=self.factory.user.api_key)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [{"name": "restricted value", "value": "restricted value"}])

    def test_user_api_key_cannot_read_unrelated_query_without_access(self):
        query = self.factory.create_query()
        data_source = self.factory.create_data_source(group=self.factory.org.admin_group)
        dropdown_query = self.create_dropdown_query(data_source=data_source)

        rv = self.get_dropdown(query, dropdown_query, api_key=self.factory.user.api_key)

        self.assertEqual(rv.status_code, 403)

    def test_session_user_can_preview_undeclared_dropdown_with_view_only_data_source_access(self):
        query = self.factory.create_query()
        data_source = self.factory.create_data_source(group=self.factory.default_group, view_only=True)
        dropdown_query = self.create_dropdown_query(data_source=data_source, user=self.factory.create_user())

        rv = self.make_request("get", "/api/queries/{}/dropdowns/{}".format(query.id, dropdown_query.id))

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [{"name": "restricted value", "value": "restricted value"}])

    def test_dashboard_key_can_read_configured_dropdown(self):
        data_source = self.factory.create_data_source(group=self.factory.org.admin_group)
        dropdown_query = self.create_dropdown_query(data_source=data_source)
        query = self.factory.create_query(
            options={"parameters": [{"name": "param", "type": "query", "queryId": dropdown_query.id}]}
        )
        visualization = self.factory.create_visualization(query_rel=query)
        widget = self.factory.create_widget(visualization=visualization)
        api_key = self.factory.create_api_key(object=widget.dashboard)

        rv = self.get_dropdown(query, dropdown_query, api_key=api_key.api_key)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [{"name": "restricted value", "value": "restricted value"}])

    def test_dashboard_key_cannot_read_unrelated_query_outside_dashboard(self):
        query = self.factory.create_query()
        dropdown_query = self.create_dropdown_query()
        visualization = self.factory.create_visualization(query_rel=query)
        widget = self.factory.create_widget(visualization=visualization)
        api_key = self.factory.create_api_key(object=widget.dashboard)

        rv = self.get_dropdown(query, dropdown_query, api_key=api_key.api_key)

        self.assertEqual(rv.status_code, 403)

    def test_dashboard_key_cannot_read_undeclared_dropdown_even_on_same_dashboard(self):
        query = self.factory.create_query()
        dropdown_query = self.create_dropdown_query()
        visualization = self.factory.create_visualization(query_rel=query)
        widget = self.factory.create_widget(visualization=visualization)
        dropdown_visualization = self.factory.create_visualization(query_rel=dropdown_query)
        self.factory.create_widget(dashboard=widget.dashboard, visualization=dropdown_visualization)
        api_key = self.factory.create_api_key(object=widget.dashboard)

        rv = self.get_dropdown(query, dropdown_query, api_key=api_key.api_key)

        self.assertEqual(rv.status_code, 403)


def make_rows_data(row_count):
    return {
        "columns": [{"name": "n", "type": "integer"}],
        "rows": [{"n": n} for n in range(row_count)],
    }


@patch("redash.settings.QUERY_RESULTS_MAX_PAGE_ROWS", 4)
class TestQueryResultPages(BaseTestCase):
    def test_json_returns_first_page_and_total_by_default(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}.json".format(query_result.id))

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["query_result"]["data"], make_rows_data(4))
        self.assertEqual(rv.json["query_result"]["row_count"], 10)

    def test_json_returns_requested_page(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}.json?offset=3&limit=2".format(query_result.id))

        self.assertEqual(rv.json["query_result"]["data"]["rows"], [{"n": 3}, {"n": 4}])

    def test_json_page_is_capped(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}.json?limit=100".format(query_result.id))

        self.assertEqual(len(rv.json["query_result"]["data"]["rows"]), 4)

    def test_cached_result_from_post_returns_requested_page(self):
        query = self.factory.create_query()
        self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request(
            "post", "/api/queries/{}/results".format(query.id), data={"parameters": {}, "offset": 8, "limit": 3}
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["query_result"]["data"]["rows"], [{"n": 8}, {"n": 9}])
        self.assertEqual(rv.json["query_result"]["row_count"], 10)

    def test_post_rejects_bad_page(self):
        query = self.factory.create_query()

        rv = self.make_request("post", "/api/queries/{}/results".format(query.id), data={"limit": "abc"})

        self.assertEqual(rv.status_code, 400)

    def test_csv_includes_every_row(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}.csv".format(query_result.id), is_json=False)

        self.assertEqual(rv.data.decode("utf-8").split(), ["n"] + [str(n) for n in range(10)])

    def test_rows_page(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}/rows?offset=5&limit=2".format(query_result.id))

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, {"rows": [{"n": 5}, {"n": 6}], "offset": 5, "row_count": 10})
        self.assertIn("max-age", rv.headers["Cache-Control"])

    def test_rows_page_is_capped(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}/rows?offset=2&limit=100".format(query_result.id))

        self.assertEqual(rv.json["rows"], [{"n": 2}, {"n": 3}, {"n": 4}, {"n": 5}])

    def test_rows_rejects_bad_page(self):
        query_result = self.factory.create_query_result(data=make_rows_data(10))

        for args in ("offset=-1", "limit=-1", "offset=abc"):
            with self.subTest(args=args):
                rv = self.make_request("get", "/api/query_results/{}/rows?{}".format(query_result.id, args))
                self.assertEqual(rv.status_code, 400)

    def test_rows_requires_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.admin_group)
        query_result = self.factory.create_query_result(data_source=ds, data=make_rows_data(10))

        rv = self.make_request("get", "/api/query_results/{}/rows".format(query_result.id))

        self.assertEqual(rv.status_code, 403)

    def create_parameterized_query_and_result(self, value):
        query = self.factory.create_query(
            query_text="SELECT {{n}}", options={"parameters": [{"name": "n", "type": "number"}]}
        )
        query_text = "SELECT {}".format(value)
        query_result = self.factory.create_query_result(
            data_source=query.data_source,
            query_text=query_text,
            query_hash=gen_query_hash(query_text),
            data=make_rows_data(10),
        )
        return query, query_result

    def get_shared_rows(self, query, query_result, api_key, parameters):
        return self.make_request(
            "get",
            "/api/queries/{}/results/{}/rows?offset=3&limit=2&api_key={}&parameters={}".format(
                query.id, query_result.id, api_key, quote(json_dumps(parameters))
            ),
            user=False,
        )

    def test_query_api_key_reads_rows_with_the_parameters_that_produced_them(self):
        query, query_result = self.create_parameterized_query_and_result(5)

        rv = self.get_shared_rows(query, query_result, query.api_key, {"n": 5})

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["rows"], [{"n": 3}, {"n": 4}])

    def test_query_api_key_cannot_read_rows_with_other_parameters(self):
        query, query_result = self.create_parameterized_query_and_result(5)

        rv = self.get_shared_rows(query, query_result, query.api_key, {"n": 6})

        self.assertEqual(rv.status_code, 404)

    def test_query_api_key_cannot_read_another_querys_rows(self):
        query, _ = self.create_parameterized_query_and_result(5)
        other_result = self.factory.create_query_result(data_source=query.data_source, data=make_rows_data(10))

        rv = self.get_shared_rows(query, other_result, query.api_key, {})

        self.assertEqual(rv.status_code, 404)

    def test_query_api_key_rejects_malformed_parameters(self):
        query, query_result = self.create_parameterized_query_and_result(5)

        rv = self.get_shared_rows(query, query_result, query.api_key, ["n", 5])

        self.assertEqual(rv.status_code, 400)

    def test_dashboard_api_key_reads_rows_of_its_queries_only(self):
        query, query_result = self.create_parameterized_query_and_result(5)
        widget = self.factory.create_widget(visualization=self.factory.create_visualization(query_rel=query))
        dashboard_key = self.factory.create_api_key(object=widget.dashboard)
        other_widget = self.factory.create_widget()
        other_key = self.factory.create_api_key(object=other_widget.dashboard)

        rv = self.get_shared_rows(query, query_result, dashboard_key.api_key, {"n": 5})
        self.assertEqual(rv.status_code, 200)

        rv = self.get_shared_rows(query, query_result, other_key.api_key, {"n": 5})
        self.assertEqual(rv.status_code, 403)

    def test_api_key_cannot_read_rows_of_unsafe_query(self):
        query = self.factory.create_query(
            query_text="SELECT '{{n}}'", options={"parameters": [{"name": "n", "type": "text"}]}
        )
        query_result = self.factory.create_query_result(
            data_source=query.data_source,
            query_text="SELECT 'x'",
            query_hash=gen_query_hash("SELECT 'x'"),
            data=make_rows_data(10),
        )

        rv = self.get_shared_rows(query, query_result, query.api_key, {"n": "x"})

        self.assertEqual(rv.status_code, 403)


class TestQueryResultChartAndFilters(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.data = {
            "columns": [{"name": "day"}, {"name": "n"}, {"name": "country::filter"}],
            "rows": [
                {"day": "mon", "n": 1, "country::filter": "us"},
                {"day": "mon", "n": 2, "country::filter": "fr"},
                {"day": "tue", "n": 4, "country::filter": "us"},
            ],
        }

    def chart_url(self, path, **args):
        args.setdefault("options", {"columnMapping": {"day": "x", "n": "y"}, "globalSeriesType": "column"})
        query = "&".join("{}={}".format(key, quote(json_dumps(value))) for key, value in args.items())
        return "{}/chart?{}".format(path, query)

    def test_chart_returns_marks_not_rows(self):
        query_result = self.factory.create_query_result(data=self.data)

        rv = self.make_request("get", self.chart_url("/api/query_results/{}".format(query_result.id)))

        self.assertEqual(rv.status_code, 200)
        self.assertEqual([(mark["day"], mark["n"]) for mark in rv.json["marks"]], [("mon", 3), ("tue", 4)])
        self.assertEqual(rv.json["row_count"], 3)

    def test_chart_applies_filters(self):
        query_result = self.factory.create_query_result(data=self.data)

        url = self.chart_url("/api/query_results/{}".format(query_result.id), filters={"country::filter": ["us"]})
        rv = self.make_request("get", url)

        self.assertEqual([(mark["day"], mark["n"]) for mark in rv.json["marks"]], [("mon", 1), ("tue", 4)])

    def test_chart_rejects_bad_arguments(self):
        query_result = self.factory.create_query_result(data=self.data)
        path = "/api/query_results/{}".format(query_result.id)

        for url in (
            self.chart_url(path, options=["x"]),
            self.chart_url(path, options={"globalSeriesType": "custom"}),
            self.chart_url(path, filters={"country::filter": "us"}),
            self.chart_url(path) + "&width=wide",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.make_request("get", url).status_code, 400)

    def test_chart_requires_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.admin_group)
        query_result = self.factory.create_query_result(data_source=ds, data=self.data)

        rv = self.make_request("get", self.chart_url("/api/query_results/{}".format(query_result.id)))

        self.assertEqual(rv.status_code, 403)

    def test_api_key_reads_chart_with_the_parameters_that_produced_it(self):
        query = self.factory.create_query(
            query_text="SELECT {{n}}", options={"parameters": [{"name": "n", "type": "number"}]}
        )
        query_result = self.factory.create_query_result(
            data_source=query.data_source, query_text="SELECT 5", query_hash=gen_query_hash("SELECT 5"), data=self.data
        )
        path = "/api/queries/{}/results/{}".format(query.id, query_result.id)

        rv = self.make_request(
            "get", self.chart_url(path, parameters={"n": 5}) + "&api_key=" + query.api_key, user=False
        )
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request(
            "get", self.chart_url(path, parameters={"n": 6}) + "&api_key=" + query.api_key, user=False
        )
        self.assertEqual(rv.status_code, 404)

    def test_rows_apply_filters_and_count_matches(self):
        query_result = self.factory.create_query_result(data=self.data)

        url = "/api/query_results/{}/rows?limit=1&filters={}".format(
            query_result.id, quote(json_dumps({"country::filter": ["us"]}))
        )
        rv = self.make_request("get", url)

        self.assertEqual(rv.json["rows"], [self.data["rows"][0]])
        self.assertEqual(rv.json["row_count"], 2)

    def test_result_carries_filter_values(self):
        query_result = self.factory.create_query_result(data=self.data)

        rv = self.make_request("get", "/api/query_results/{}.json?limit=0".format(query_result.id))

        self.assertEqual(rv.json["query_result"]["filter_values"], {"country::filter": ["us", "fr"]})
        self.assertEqual(rv.json["query_result"]["data"]["rows"], [])


class TestQueryResultExcelResponse(BaseTestCase):
    def test_renders_excel_file(self):
        query = self.factory.create_query()
        query_result = self.factory.create_query_result()

        rv = self.make_request(
            "get",
            "/api/queries/{}/results/{}.xlsx".format(query.id, query_result.id),
            is_json=False,
        )
        self.assertEqual(rv.status_code, 200)

    def test_renders_excel_file_when_rows_have_missing_columns(self):
        query = self.factory.create_query()
        data = {
            "rows": [{"test": 1}, {"test": 2, "test2": 3}],
            "columns": [{"name": "test"}, {"name": "test2"}],
        }
        query_result = self.factory.create_query_result(data=data)

        rv = self.make_request(
            "get",
            "/api/queries/{}/results/{}.xlsx".format(query.id, query_result.id),
            is_json=False,
        )
        self.assertEqual(rv.status_code, 200)


class TestJobResource(BaseTestCase):
    def test_cancels_queued_queries(self):
        QUEUED = 1
        FAILED = 4

        query = self.factory.create_query()
        job_id = self.make_request(
            "post",
            f"/api/queries/{query.id}/results",
            data={"parameters": {}},
        ).json[
            "job"
        ]["id"]

        status = self.make_request("get", f"/api/jobs/{job_id}").json["job"]["status"]
        self.assertEqual(status, QUEUED)

        self.make_request("delete", f"/api/jobs/{job_id}")

        job = self.make_request("get", f"/api/jobs/{job_id}").json["job"]
        self.assertEqual(job["status"], FAILED)
        self.assertTrue("cancelled" in job["error"])
