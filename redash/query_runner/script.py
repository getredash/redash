import os
import subprocess

from redash.query_runner import BaseQueryRunner, register


def query_to_script_path(path, query):
    if path != "*":
        script = os.path.join(path, query.split(" ")[0])
        if not os.path.exists(script):
            raise IOError("Script '{}' not found in script directory".format(query))

        return os.path.join(path, query).split(" ")

    return query


def run_script(script, shell):
    output = subprocess.check_output(script, shell=shell)
    if output is None:
        return None, "Error reading output"

    output = output.strip()
    if not output:
        return None, "Empty output from script"

    return output, None


class Script(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def enabled(cls):
        return "check_output" in subprocess.__dict__

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "title": "Scripts path"},
                "shell": {
                    "type": "boolean",
                    "title": "Execute command through the shell",
                },
            },
            "required": ["path"],
        }

    @classmethod
    def type(cls):
        return "insecure_script"

    def __init__(self, configuration):
        super(Script, self).__init__(configuration)

        path = self.configuration.get("path", "")
        # If path is * allow any execution path
        if path == "*":
            return

        # Poor man's protection against running scripts from outside the scripts directory
        if path.find("../") > -1:
            raise ValueError("Scripts can only be run from the configured scripts directory")

    def test_connection(self):
        pass

    def run_query(self, query, user):
        try:
            script = query_to_script_path(self.configuration["path"], query)
            return run_script(script, self.configuration["shell"])
        except IOError as e:
            return None, str(e)
        except subprocess.CalledProcessError as e:
            return None, str(e)


register(Script)
