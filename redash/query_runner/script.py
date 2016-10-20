import os
import sys
import subprocess

from redash.query_runner import *


class Script(BaseQueryRunner):
    @classmethod
    def enabled(cls):
        return "check_output" in subprocess.__dict__

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'path': {
                    'type': 'string',
                    'title': 'Scripts path'
                }
            },
            'required': ['path']
        }

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(Script, self).__init__(configuration)

        # Poor man's protection against running scripts from outside the scripts directory
        if self.configuration["path"].find("../") > -1:
            raise ValueError("Scripts can only be run from the configured scripts directory")

    def test_connection(self):
        pass

    def run_query(self, query):
        try:
            json_data = None
            error = None

            query = query.strip()

            script = os.path.join(self.configuration["path"], query.split(" ")[0])
            if not os.path.exists(script):
                return None, "Script '%s' not found in script directory" % query

            script = os.path.join(self.configuration["path"], query)

            output = subprocess.check_output(script.split(" "), shell=False)
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

register(Script)
