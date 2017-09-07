import requests
import json
import string
from redash.query_runner import BaseQueryRunner, register
from pydrill.client import PyDrill
class Zendesk(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "default": "https://domain.zendesk.com/api/v2/groups.json"
                },
                "email": {
                    "type": "string",
                    "default": "default"
                },
                "pwd": {
                    "type": "string"
                }
            },
            "required": ["email"],
            "secret": ["pwd"]
        }

    @classmethod
    def annotate_query(cls):
        return False
    def test_connection(self):
        pass
    def run_query(self, query, user):
        base_url = self.configuration.get("url", None)
        pwd = self.configuration.get("pwd", None)
        email = self.configuration.get("email", None)
        try:
            error = None
            query = query.strip()
            if base_url is not None and base_url != "":
                if query.find("://") > -1:
                    return None, "Accepting only relative URLs to '%s'" % base_url
            if base_url is None:
                base_url = ""
            url = base_url + query
            response = requests.get(url,auth=(email, pwd))
            response.raise_for_status()
            json_data = response.content.strip()
            columns = []
            columns.append({
            "friendly_name": "created_at",
            "type": "string",
            "name": "created_at"
            })
            columns.append({
            "friendly_name": "tags",
            "type": "string",
            "name": "tags"
            })
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
                response = requests.get(json_data['next_page'],auth=(email, pwd))
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
            drill = PyDrill(host='localhost', port=8047)
            yelp_reviews = drill.query('''SELECT t.flatdata.id FROM (select flatten(Rows1) AS flatdata FROM dfs.`/home/nima/Desktop/data.json`) t''')
            for result in yelp_reviews:
            print result       
            #json_data = {'columns':columns,'rows':rows}
            
            #json_data = json.dumps(json_data,encoding='latin1')
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
