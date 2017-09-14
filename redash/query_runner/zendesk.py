import requests
import json
import string
import os
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
                    "default": "https://domain.zendesk.com",
                    "title" : "Zendesk URL"
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
        response = requests.get(self.base_url+'/api/v2/users.json',auth=(self.configuration.get("email", None), self.configuration.get("pwd", None)))
        if response.status_code != 200:
            raise Exception("Not Authorized! (http status code: {0}).".format(response.status_code))
        
    def run_query(self, query, user):
        try:
            query = query.strip()
            error = None
            
            if query.find("://") > -1:
                    return None, "Accepting only relative URLs to '%s'" % self.base_url
                
            columnnames=['id',
              'created_at',
              'updated_at',
              'status',
              'tags',
              'assignee_id',
              'submitter_id',
              'brand_id',
              'via',
              'subject',
              'priority',
              'satisfaction_rating',
              'type',
              'forum_topic_id',
              'organization_id',
              'due_at',
              'is_public',
              'requester_id',
              'recipient',
              'problem_id',
              'url',
              'raw_subject',
              'allow_channelback',
              'has_incidents',
              'group_id',
              'external_id',
              'result_type']
            
            queries = query.split(";")
            
            sqlquery = None
            if len(queries ) > 1 :
                sqlquery=queries[1]
                
            zendeskquery = queries[0]
            url = self.base_url +'/api/v2/search.json?query='+ zendeskquery
            response = requests.get(url,auth=self.auth )
            response.raise_for_status()
            json_data = response.content.strip()
            json_data = json.loads(json_data)
            row={}
            rows=[]
            
            for result in json_data['results']:
                for column in columnnames:
                    row[column]=result[column]
                rows.append(row)
                row={}
                
            while(json_data['next_page'] is not None):
                response = requests.get(json_data['next_page'],auth=self.auth)
                response.raise_for_status()
                json_data = response.content.strip()
                json_data = json.loads(json_data)
                for result in json_data['results']:
                    for column in columnnames:
                        row[column]=result[column]
                    rows.append(row)
                    row={}
                    
            if sqlquery is not None and len(sqlquery)>1:
                jsonfile="/tmp/"+str(randint(100, 1000))+".json"
                json_temp = {'temp':rows}
                with open(jsonfile,'w+') as outfile:
                    json.dump(json_temp,outfile)
                rows=[]
                drill = PyDrill(host='localhost', port=8047)
                table="(select flatten(temp) AS flatdata FROM dfs.`"+jsonfile+"`)"
                sqlquery=sqlquery.replace('report',table) 
                data = drill.query(sqlquery)
                for result in data:
                    columnnames = list(result.keys())
                    for column in columnnames:
                        row[column]=result[column]
                    rows.append(row)
                    row={}
                os.remove(jsonfile)
                
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

