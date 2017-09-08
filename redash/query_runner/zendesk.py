import requests
import json
import string
from redash.query_runner import BaseQueryRunner, register
from pydrill.client import PyDrill
from random import randint
class Zendesk(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "default": "https://domain.zendesk.com/api/v2/search.json?"
                },
                "email": {
                    "type": "string",
                    "default": "default"
                },
                "pwd": {
                    "type": "string"
                }
            },
            "required": ["email","pwd"],
            "secret": ["pwd"]
        }

    @classmethod
    def annotate_query(cls):
        return False
    def __init__(self, configuration):
        super(Zendesk, self).__init__(configuration)
        self.auth = (self.configuration["email"], self.configuration["pwd"])
        self.base_url = self.configuration.get("url", None)
    def test_connection(self):
        response = requests.get(self.base_url,auth=(self.configuration.get("email", None), self.configuration.get("pwd", None)))
        if response.status_code != 200:
            raise Exception("Not Authorized! (http status code: {0}).".format(response.status_code))
    def run_query(self, query, user):
        try:
            jsonfilepath='/tmp/'+randint(0, 1000)+'.json'
            error = None
            query = query.strip()
            if query.find("://") > -1:
                    return None, "Accepting only relative URLs to '%s'" % self.base_url
            url = self.base_url + query
            response = requests.get(url,auth=self.auth )
            response.raise_for_status()
            json_data = response.content.strip()
            json_data = json.loads(json_data)
            row={}
            rows=[]
            for i in json_data['results']:
                row['id']= i['id']
                row['created_at']= i['created_at']
                row['status']= i['status']
                row['tags']= i['tags']
                rows.append(row)
            while(json_data['next_page'] is not None):
                response = requests.get(json_data['next_page'],auth=self.auth)
                response.raise_for_status()
                json_data = response.content.strip()
                json_data = json.loads(json_data)
                for i in json_data['results']:
                    row['id']= i['id']
                    row['created_at']= i['created_at']
                    row['status']= i['status']
                    row['tags']= i['tags']
                    rows.append(row)
                    row={}
            json_data1 = {'temp':rows}
            with open(jsonfilepath,'w+') as outfile:
                json.dump(json_data1,outfile)
            rows=[]
            drill = PyDrill(host='localhost', port=8047)
            data = drill.query('''SELECT * (select flatten(temp) AS flatdata FROM dfs.`'''+jsonfilepath+'''`) t''')
            for result in data:
                columnnames = list(result.keys())
                for column in columnnames:
                    row[column]=result[column]
                rows.append(row)
                row={}
            columns = []  
            for column in columnnames:
                columns.append({
                        "friendly_name": column,
                        "type": "string",
                        "name": column
                        })
            json_data = {'columns':columns,'rows':rows}
            json_data = json.dumps(json_data,encoding='latin1')
            return json_data, error
            if not json_data:
                error = "Got empty response from '{}'.".format(url)
            return json_data, error
        except requests.RequestException as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        return json_data, error
register(Zendesk)
