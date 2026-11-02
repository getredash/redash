from collections import OrderedDict
from unittest import TestCase

import mock

from redash.query_runner import TYPE_INTEGER, TYPE_STRING
from redash.query_runner.salesforce import Salesforce

CONFIGURATION = {"username": "user", "password": "pwd", "token": "token"}


def record(**fields):
    return OrderedDict([("attributes", {"type": "Account"})] + list(fields.items()))


@mock.patch("redash.query_runner.salesforce.SimpleSalesforce")
class TestSalesforce(TestCase):
    def test_sandbox_uses_test_domain(self, simple_salesforce):
        Salesforce(dict(CONFIGURATION, sandbox=True))._get_sf()
        self.assertEqual("test", simple_salesforce.call_args.kwargs["domain"])

    def test_production_uses_default_domain(self, simple_salesforce):
        Salesforce(CONFIGURATION)._get_sf()
        self.assertIsNone(simple_salesforce.call_args.kwargs["domain"])

    def test_default_api_version(self, simple_salesforce):
        Salesforce(CONFIGURATION)._get_sf()
        self.assertEqual("38.0", simple_salesforce.call_args.kwargs["version"])

    def test_count_query_returns_server_total(self, simple_salesforce):
        sf = simple_salesforce.return_value
        sf.query.return_value = {"totalSize": 42, "done": True, "records": []}

        data, error = Salesforce(CONFIGURATION).run_query("SELECT COUNT() FROM Account", None)

        self.assertIsNone(error)
        self.assertEqual([{"name": "Count", "friendly_name": "Count", "type": TYPE_INTEGER}], data["columns"])
        self.assertEqual([{"Count": 42}], data["rows"])

    def test_follows_next_records_url(self, simple_salesforce):
        sf = simple_salesforce.return_value
        sf.query.return_value = {
            "totalSize": 2,
            "done": False,
            "nextRecordsUrl": "/services/data/v38.0/query/01g-2000",
            "records": [record(Name="first")],
        }
        sf.query_more.return_value = {"totalSize": 2, "done": True, "records": [record(Name="second")]}
        sf.Account.describe.return_value = {"fields": [{"name": "Name", "type": "string"}]}

        data, error = Salesforce(CONFIGURATION).run_query("SELECT Name FROM Account", None)

        self.assertIsNone(error)
        sf.query_more.assert_called_once_with("/services/data/v38.0/query/01g-2000", identifier_is_url=True)
        self.assertEqual([{"name": "Name", "friendly_name": "Name", "type": TYPE_STRING}], data["columns"])
        self.assertEqual([{"Name": "first"}, {"Name": "second"}], data["rows"])
