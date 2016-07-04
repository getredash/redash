from base64 import b64decode
import json
import logging
import sys
from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import gspread
    from oauth2client.client import SignedJwtAssertionCredentials
    from dateutil import parser
    enabled = True
except ImportError:
    enabled = False


def _load_key(filename):
    with open(filename, "rb") as f:
        return json.loads(f.read())


def _guess_type(value):
    if value == '':
        return TYPE_STRING
    try:
        val = int(value)
        return TYPE_INTEGER
    except ValueError:
        pass
    try:
        val = float(value)
        return TYPE_FLOAT
    except ValueError:
        pass
    if unicode(value).lower() in ('true', 'false'):
        return TYPE_BOOLEAN
    try:
        val = parser.parse(value)
        return TYPE_DATETIME
    except ValueError:
        pass
    return TYPE_STRING


def _value_eval_list(value):
    value_list = []
    for member in value:
        if member == '' or member is None:
            val = None
            value_list.append(val)
            continue
        try:
            val = int(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        try:
            val = float(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        if unicode(member).lower() in ('true', 'false'):
            if unicode(member).lower() == 'true':
                value_list.append(True)
            else:
                value_list.append(False)
            continue
        try:
            val = parser.parse(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        value_list.append(member)
    return value_list


class GoogleSpreadsheet(BaseQueryRunner):
    HEADER_INDEX = 0

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "google_spreadsheets"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'jsonKeyFile': {
                    "type": "string",
                    'title': 'JSON Key File'
                }
            },
            'required': ['jsonKeyFile'],
            'secret': ['jsonKeyFile']
        }

    def __init__(self, configuration):
        super(GoogleSpreadsheet, self).__init__(configuration)

    def _get_spreadsheet_service(self):
        scope = [
            'https://spreadsheets.google.com/feeds',
        ]

        key = json.loads(b64decode(self.configuration['jsonKeyFile']))
        credentials = SignedJwtAssertionCredentials(key['client_email'], key["private_key"], scope=scope)
        spreadsheetservice = gspread.authorize(credentials)
        return spreadsheetservice

    def run_query(self, query):
        logger.debug("Spreadsheet is about to execute query: %s", query)
        values = query.split("|")
        key = values[0] #key of the spreadsheet
        worksheet_num = 0 if len(values) != 2 else int(values[1])# if spreadsheet contains more than one worksheet - this is the number of it
        try:
            spreadsheet_service = self._get_spreadsheet_service()
            spreadsheet = spreadsheet_service.open_by_key(key)
            worksheets = spreadsheet.worksheets()
            all_data = worksheets[worksheet_num].get_all_values()
            column_names = []
            columns = []
            for j, column_name in enumerate(all_data[self.HEADER_INDEX]):
                column_names.append(column_name)
                columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': _guess_type(all_data[self.HEADER_INDEX + 1][j])
                })
            rows = [dict(zip(column_names, _value_eval_list(row))) for row in all_data[self.HEADER_INDEX + 1:]]
            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

register(GoogleSpreadsheet)
