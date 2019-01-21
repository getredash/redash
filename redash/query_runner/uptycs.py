import os
import sys
import json
import jwt
import datetime
import requests
import urllib3
import logging
logger = logging.getLogger(__name__)

from redash.query_runner import *
from redash.utils import JSONEncoder

enabled = True

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Uptycs(BaseSQLQueryRunner):

    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string"
                },
                 "customerid": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "secret": {
                    "type": "string",
                },
            },
            "order": ['url', 'customerid', 'key', 'secret'],
            "required": ["url", "customerid", "key","secret"],
            "secret": ["secret", "customerid", "key"]
        }


    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False


    @classmethod
    def type(cls):
        return "uptycs"


    def generateHeaders(self, key, secret):
        header={}
        utcnow=datetime.datetime.utcnow()
        date=utcnow.strftime("%a, %d %b %Y %H:%M:%S GMT")
        authVar = jwt.encode({'iss': key}, secret, algorithm='HS256')
        authorization="Bearer %s" % (authVar)
        header['date']=date
        header['Authorization']=authorization
        return header

    def transformed_to_redash_json(self, data):
        transformed_columns = []
        rows = []
        # convert all type to JSON string
        # In future we correct data type  mapping later
        if 'columns' in data:
            for json_each in data['columns']:
                name = json_each['name']
                new_json = {"name": name, 
                            "type": "string", 
                            "friendly_name": "null"}
                transformed_columns.append(new_json)
        # Transfored items into rows.
        if 'items' in data:
            rows = data['items']

        redash_json_data = {"columns": transformed_columns, 
                            "rows": rows}  
        return redash_json_data

    def restcall(self, sql):
        # JWT encoded header
        header = self.generateHeaders( self.configuration.get('key'), 
                                       self.configuration.get('secret'))

        # URL form using API key file based on GLOBAL
        url=("%s/public/api/customers/%s/query" %
            (self.configuration.get('url'), 
             self.configuration.get('customerid')));

        # post data base sql
        post_data_json = { "query": sql }

        response = requests.post(url, headers=header, 
                json=post_data_json, verify=False )
        response_output = json.loads(response.content)
     
        json_data = self.transformed_to_redash_json(response_output)
        error = None
        # if we got error from Uptycs include error information
        if 'error' in response_output:
            error = response_output['error']['message']['brief']
            error = error + '\n' + response_output['error']['message']['detail']
        return json_data, error

    def run_query(self, query, user):
        data, error = self.restcall(query)
        json_data = json.dumps(data, cls=JSONEncoder)
        logger.debug("%s",json_data)
        return json_data, error

    def get_schema(self, get_stats=False):
        header = self.generateHeaders(self.configuration.get('key'), 
                                     self.configuration.get('secret'))
        url = ("%s/public/api/customers/%s/schema/global" %
                (self.configuration.get('url'), 
                self.configuration.get('customerid')))
        response = requests.get(url, headers=header, verify=False )
        redash_json = []
        schema = json.loads(response.content)
        for each_def in schema['tables']:
            table_name = each_def['name']
            columns = []
            for col in each_def['columns']:
                columns.append(col['name'])
            table_json = {"name": table_name, "columns": columns}
            redash_json.append(table_json)
        logger.debug("%s", schema.values())
        return redash_json

register(Uptycs)

