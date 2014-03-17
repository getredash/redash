import json
import logging
import sys
import os
import urllib2

def url(connection_string):

    def query_runner(query):
        base_url = connection_string

        try:
            json_data = None
            error = None

            query = query.strip()

            # Remove the SQL comment that Redash adds
            if query.find("/*") > -1 and query.find("*/") > -1:
                query = query[query.find("*/")+3:]

            if base_url is not None and base_url != "":
                if query.find("://") > -1:
                    return None, "Accepting only relative URLs to '%s'" % base_url

            if base_url is None:
                base_url = ""

            url = base_url + query

            json_data = urllib2.urlopen(url).read().strip()

            if not json_data:
                error = "Error reading data from '%s'" % url

            return json_data, error

        except urllib2.URLError as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

    return query_runner
