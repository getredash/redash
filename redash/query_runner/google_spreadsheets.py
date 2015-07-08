import datetime
import json
import logging
import sys
import time

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import gspread
    from oauth2client.client import SignedJwtAssertionCredentials

    enabled = True
except ImportError:
    logger.warning("Missing dependencies. Please install gspread and oauth2client.")
    logger.warning("You can use pip:   pip install gspread oauth2client")

    enabled = False


def transform_row(row, fields):
    column_index = 0
    row_data = {}


    return row_data


def _load_key(filename):
    with open(filename, "rb") as f:
        return f.read()


class GoogleSpreadsheet(BaseQueryRunner):
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
                'email': {
                    'type': 'string',
                    'title': 'Account email'
                },
                'privateKey': {
                    'type': 'string',
                    'title': 'Private Key Path'
                }
            },
            'required': ['serviceAccount', 'privateKey']
        }

    def __init__(self, configuration_json):
        super(GoogleSpreadsheet, self).__init__(configuration_json)

    def _get_spreadsheet_service(self):
        scope = [
            "https://spreadsheets.google.com/feeds",
        ]

        private_key = _load_key(self.configuration["privateKey"])
        credentials = SignedJwtAssertionCredentials(self.configuration['serviceAccount'], private_key, scope=scope)
        spreadsheetservice = gspread.authorize(credentials)
        return spreadsheetservice

    def run_query(self, query):
        logger.debug("Spreadsheet is about to execute query: %s", query)
        values = query.split("|")
        key = values[0] #key of the spreadsheet
        worksheet_num = values[1] # if spreadsheet contains more than one worksheet - this is the number of it
        spreadsheet_service = self._get_spreadsheet_service()

        spreadsheet = spreadsheet_service.open_by_key(key)
        worksheets = spreadsheet.worksheets()

        allData = worksheets[worksheet_num].get_all_values()
        logger.info(allData)

        return None, None

register(GoogleSpreadsheet)
