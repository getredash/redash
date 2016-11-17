import os
import sys
import subprocess

from redash.query_runner import *

class InsecureScript(BaseQueryRunner):
    @classmethod
    def enabled(cls):
        return True 
        
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {}
        }

    @classmethod
    def type(cls):
        return "insecure_script"

    def __init__(self, configuration_json):
        super(InsecureScript, self).__init__(configuration_json)
        self.syntax = 'insecure_script'

    def run_query(self, query):
        try:
            json_data = None
            error = None

            script = query.split("*/ ")[1]
            try:
                output = subprocess.check_output(script, shell=True)
            except:
                raise Exception(script)
            if output is not None:
                output = output.strip()
                if output != "":
                    return output, None

            error = "Error reading output"
        except subprocess.CalledProcessError as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

register(InsecureScript)