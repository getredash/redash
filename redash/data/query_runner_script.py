import json
import logging
import sys
import os
import subprocess

# We use subprocess.check_output because we are lazy.
# If someone will really want to run this on Python < 2.7 they can easily update the code to run
# Popen, check the retcodes and other things and read the standard output to a variable.
if not "check_output" in subprocess.__dict__:
    print "ERROR: This runner uses subprocess.check_output function which exists in Python 2.7"

def script(connection_string):

    def query_runner(query):
        try:
            json_data = None
            error = None

            # Poor man's protection against running scripts from output the scripts directory
            if connection_string.find("../") > -1:
                return None, "Scripts can only be run from the configured scripts directory"

            query = query.strip()

            script = os.path.join(connection_string, query)
            if not os.path.exists(script):
                return None, "Script '%s' not found in script directory" % query

            output = subprocess.check_output(script, shell=False)
            if output != None:
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

    query_runner.annotate_query = False
    return query_runner
