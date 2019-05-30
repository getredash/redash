import json
import urllib2
from redash.query_runner import *


try:
    from mixpanel_api import Mixpanel
    from ssl import SSLError
    import base64

    # Add a patch because Mixpanel's default behavior logs errors in console.
    # However, we want to log errors into Redash's UI this way users can debug them.
    # Thus, I removed all the code that reads errors and write them in console.
    class MixpanelPatched(Mixpanel):
        def request(self, base_url, path_components, params, method='GET', headers=None, raw_stream=False, retries=0):
            if retries < self.max_retries:
                # Add API version to url path if needed
                if base_url == Mixpanel.IMPORT_API or base_url == Mixpanel.BETA_IMPORT_API:
                    base = [base_url]
                else:
                    base = [base_url, str(Mixpanel.VERSION)]

                request_url = '/'.join(base + path_components)

                encoded_params = Mixpanel._unicode_urlencode(params)

                # Set up request url and body based on HTTP method and endpoint
                if method == 'GET' or method == 'DELETE':
                    data = None
                    request_url += '?' + encoded_params
                else:
                    data = encoded_params
                    if base_url == self.IMPORT_API or 'import-people' in path_components or 'import-events' in path_components:
                        data += '&verbose=1'
                        # Uncomment the line below to log the request body data
                        # Mixpanel.LOGGER.debug(method + ' data: ' + data)
                Mixpanel.LOGGER.debug("Request Method: " + method)
                Mixpanel.LOGGER.debug("Request URL: " + request_url)

                if headers is None:
                    headers = {}
                headers['Authorization'] = 'Basic {encoded_secret}'.format(
                    encoded_secret=base64.b64encode(self.api_secret + ':'))
                request = urllib2.Request(request_url, data, headers)
                Mixpanel.LOGGER.debug("Request Headers: " + json.dumps(headers))
                # This is the only way to use HTTP methods other than GET or POST with urllib2
                if method != 'GET' and method != 'POST':
                    request.get_method = lambda: method

                try:
                    response = urllib2.urlopen(request, timeout=self.timeout)
                    if raw_stream and base_url == Mixpanel.RAW_API:
                        return response
                except urllib2.HTTPError as e:
                    Mixpanel.LOGGER.warning('The server couldn\'t fulfill the request.')
                    Mixpanel.LOGGER.warning('Error code: ' + str(e.code))
                    Mixpanel.LOGGER.warning('Reason: ' + str(e.reason))
                    if e.code >= 500:
                        # Retry if we get an HTTP 5xx error
                        Mixpanel.LOGGER.warning("Attempting retry #" + str(retries + 1))
                        self.request(base_url, path_components, params, method=method, headers=headers,
                                     raw_stream=raw_stream, retries=retries + 1)
                    else:
                        raise
                except urllib2.URLError as e:
                    Mixpanel.LOGGER.warning('We failed to reach a server.')
                    Mixpanel.LOGGER.warning('Reason: ' + str(e.reason))
                    if hasattr(e, 'read'):
                        Mixpanel.LOGGER.warning('Response: ' + e.read())
                    Mixpanel.LOGGER.warning("Attempting retry #" + str(retries + 1))
                    self.request(base_url, path_components, params, method=method, headers=headers, raw_stream=raw_stream,
                                 retries=retries + 1)
                except SSLError as e:
                    if e.message == 'The read operation timed out':
                        Mixpanel.LOGGER.warning('The read operation timed out.')
                        self.timeout = self.timeout + 30
                        Mixpanel.LOGGER.warning(
                            'Increasing timeout to ' + str(self.timeout) + ' and attempting retry #' + str(retries + 1))
                        self.request(base_url, path_components, params, method=method, headers=headers,
                                     raw_stream=raw_stream, retries=retries + 1)
                    else:
                        raise
                else:
                    try:
                        # If the response is gzipped we go ahead and decompress
                        if response.info().get('Content-Encoding') == 'gzip':
                            buf = cStringIO.StringIO(response.read())
                            f = gzip.GzipFile(fileobj=buf)
                            response_data = f.read()
                        else:
                            response_data = response.read()
                        return response_data
                    except IncompleteRead as e:
                        Mixpanel.LOGGER.warning("Response data is incomplete. Attempting retry #" + str(retries + 1))
                        self.request(base_url, path_components, params, method=method, headers=headers,
                                     raw_stream=raw_stream, retries=retries + 1)
            else:
                Mixpanel.LOGGER.warning("Maximum retries reached. Request failed. Try again later.")
                raise BaseException

except ImportError:
    enabled = False
else:
    enabled = True


def flatten_row(row):
    result = {}
    for k in row:
        if type(row[k]) is dict:
            for j in row[k]:
                result[k + "_" + j] = row[k][j]
        elif type(row[k]) is list:
            for index, j in enumerate(row[k]):
                result[k + "_" + str(index)] = row[k][index]
        else:
            result[k] = row[k]
    return result


class MixpanelJql(BaseQueryRunner):
    noop_query = '''
        main = () => People().reduce(mixpanel.reducer.null())
    '''

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "mixpanel_jql"

    @classmethod
    def name(cls):
        return "Mixpanel JQL"

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'api_secret': {
                    'type': 'string',
                    'title': 'API Secret'
                },
                'api_token': {
                    'type': 'string',
                    'title': 'API Token'
                }
            },
            "required": ["api_secret", "api_token"],
            "secret": ["api_secret"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        api_secret = self.configuration.get('api_secret')
        api_token = self.configuration.get('api_token')
        api = MixpanelPatched(api_secret, token=api_token)

        try:
            data = api.query_jql(query)
        except urllib2.HTTPError as e:
            if hasattr(e, 'read'):
                error = json.loads(e.read())['error']
            else:
                error = unicode(e.reason)
            return None, error
        except Exception as e:
            return None, e
        else:
            result = {}
            if (not isinstance(data[0], dict)) or type(data[0]) in [str, unicode]:
                result["columns"] = [{"type": guess_type(data[0]), "name": "value", "friendly_name": "value"}]
                result["rows"] = [{"value": v} for v in data]
            elif isinstance(data[0], dict):
                result["columns"] = []
                for k in data[0]:
                    if type(data[0][k]) is dict:
                        for j in data[0][k]:
                            result["columns"].append({"type": guess_type(data[0][k][j]), "name": k + "_" + j, "friendly_name": k + "_" + j})
                    elif type(data[0][k]) is list:
                        for index, j in enumerate(data[0][k]):
                            result["columns"].append({"type": guess_type(data[0][k][index]), "name": k + "_" + str(index), "friendly_name": k + "_" + str(index)})
                    else:
                        result["columns"].append({"type": guess_type(data[0][k]), "name": k, "friendly_name": k})
                result["rows"] = map(flatten_row, data)
            else:
                result["columns"] = [{"type": guess_type(data[0][k]), "name": k, "friendly_name": k} for k in range(len(data[0]))]
                result["rows"] = data
            return json.dumps(result), None


register(MixpanelJql)
