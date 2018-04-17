import json
import logging

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    import xlrd
    import numpy as np
    enabled = True
except ImportError:
    enabled = False


class Excel(BaseQueryRunner):
    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "excel"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {},
        }

    def __init__(self, configuration):
        super(Excel, self).__init__(configuration)
        self.syntax = "excel"

    def test_connection(self):
        pass

    def run_query(self, query, user):
        values = query.split("|")
        path = values[0]
        worksheet_id = 0 if len(values) != 2 else int(values[1])  # if spreadsheet contains more than one worksheet - this is the number of it

        try:
            workbook = pd.read_excel(path, sheet_name=worksheet_id)
            
            df = workbook.copy()
            data = {'columns': [], 'rows': []}
            conversions = [
                {'pandas_type': np.integer, 'redash_type': 'integer',},
                {'pandas_type': np.inexact, 'redash_type': 'float',},
                {'pandas_type': np.datetime64, 'redash_type': 'datetime', 'to_redash': lambda x: x.strftime('%Y-%m-%d %H:%M:%S')},
                {'pandas_type': np.bool_, 'redash_type': 'boolean'},
                {'pandas_type': np.object, 'redash_type': 'string'}
            ]
            labels = []
            for dtype, label in zip(df.dtypes, df.columns):
                for conversion in conversions:
                    if issubclass(dtype.type, conversion['pandas_type']):
                        data['columns'].append({'name': label, 'friendly_name': label, 'type': conversion['redash_type']})
                        labels.append(label)
                        func = conversion.get('to_redash')
                        if func:
                            df[label] = df[label].apply(func)
                        break
            data['rows'] = df[labels].replace({np.nan: None}).to_dict(orient='records')

            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            error = "Error reading {0}. {1}".format(path, str(e))
            json_data = None

        return json_data, error

register(Excel)
