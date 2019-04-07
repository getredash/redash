import logging
import time,os

from redash import models
from redash import settings
from redash.models import QueryResult
from redash.query_runner.pg import PostgreSQL
from tests import BaseTestCase
from tests.factories import *

logger = logging.getLogger(__name__)


class testRequest():
    pass

class testTask(object):
    request=testRequest()

    def __init__(self):
        self.request.id=1
        self.request.delivery_info={'routing_key': 'test'}

class QueryResultDataTests(BaseTestCase):

    cf = ConfigurationContainer.from_json(
        '{"dbname": "tests", "user":"postgres", "password":"postgres", "host":"postgres", "port":"5432"}')
    #cm = mock.patch("celery.app.task.Context.delivery_info", {'routing_key': 'test'})
    def setUp(self):
        super(QueryResultDataTests, self).setUp()
        self.data_source = self.factory.data_source
        self.user = self.factory.user
        self.qr = PostgreSQL(self.cf)
        self.sample_query="""SELECT 'row1' as col2, 1 as col2 , CURRENT_DATE as col3 
               UNION ALL 
               SELECT 'row2' as col2, 2 as col2 , CURRENT_DATE as col3"""

    def _execute_query(self,_query):

        data, error = self.qr.run_query(_query, self.user)
        run_time = time.time() - time.time()
        self.query_hash = gen_query_hash(_query)
        query_result, updated_query_ids = models.QueryResult.store_result(
            self.data_source.org_id, self.data_source,
            self.query_hash, _query, data,
            run_time, utcnow())
        models.db.session.commit()
        return data, query_result

    def test_create_query_result(self):
        settings.QUERY_RESULTS_STORAGE_TYPE = "db"
        data1, query_result1 = self._execute_query("SELECT 'Test1row1Val' as col1, 123 as col2, now() as coll3")
        settings.QUERY_RESULTS_STORAGE_TYPE = "file"
        data2, query_result2 = self._execute_query("SELECT 'Test2row"+"""ddfdf=
        dhhd"""+"1Val' as col1, 223 as col2, now() as coll3")
        self.assertEqual(str(type(data1)), str(type(data2)))
        self.assertEqual(str(type(query_result1.get_data())), str(type(query_result2.get_data())))
        self.assertEqual(str(type(query_result1.get_data())), str(type(data1)))

        self.assertEqual('Test1row1Val' in str(data1), True)
        self.assertEqual("filename" in str(data2),True)
        self.assertEqual('Test1row1Val' in query_result1.get_data()['rows'][0].values(), True)
        self.assertEqual('Test2row'+"""ddfdf=
        dhhd"""+'1Val' in query_result2.get_data()['rows'][0].values(), True)

    def test_load_query_result(self):
        settings.QUERY_RESULTS_STORAGE_TYPE = "db"
        data1, query_result1 = self._execute_query("SELECT 'row1' as col1, 1 as col2")
        settings.QUERY_RESULTS_STORAGE_TYPE = "file"
        data2, query_result2 = self._execute_query("SELECT 'row1' as col1, 2 as col2")

        self.assertNotEqual(query_result1.id, query_result2.id)
        result1 = db.session.query(QueryResult).get(query_result1.id)
        self.assertEqual(str(type(query_result1.get_data())),str(type(result1.get_data())))
        self.assertEqual(str(type(query_result1.get_data())),str(type(data1)))

        result2 = db.session.query(QueryResult).get(query_result2.id)
        self.assertEqual(str(type(query_result2.get_data())),str(type(result2.get_data())))
        self.assertEqual(str(type(query_result2.get_data())),str(type(data2)))


    def test_delete_query_result(self):
        settings.QUERY_RESULTS_STORAGE_TYPE = "file"
        data2, query_result2 = self._execute_query("SELECT 'row1' as col1, 2 as col2")
        file =  os.path.join(settings.QUERY_RESULTS_STORAGE_FILE_DIR, data2.get("filename"))
        self.assertEqual(os.path.isfile(file) ,True)
        query_result2.delete()
        self.assertEqual(os.path.isfile(file) ,False)
