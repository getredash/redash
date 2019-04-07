from __future__ import generators
import logging
import os
import uuid
import jsonlines as jsonlines
from redash import settings
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)


class QueryResultData(object):
    data = None
    data_handler = "db"

    def __init__(self, data=None):
        self.data = data

    def get(self):
        return self.data or {}

    def delete(self):
        return True

    def save(self, query_runner):
        raise NotImplemented()


class QueryResultDbData(QueryResultData):
    data_handler = "db"

    def save(self, query_runner):
        return query_runner.get_data()


class QueryResultFileData(QueryResultData):
    data = None
    filename = None
    data_handler = "file"
    sample_row_limit = 50

    def __init__(self, data=None):
        if data is None:
            self.filename = str(uuid.uuid4()) + ".jsonl"
            self.data = {'filename': self.filename, 'data_handler': self.data_handler,
                         'rows_count': 0, 'sample_rows_count': 0, 'sample_rows': {},
                         'columns': {}
                         }
        else:
            self.data = data
            if 'filename' in data and data.get('filename', None) is not None:
                self.filename = data.get('filename', None)
            else:
                raise Exception("Filename not found!")

    def delete(self):
        try:
            os.remove(self._get_file_path())
        except Exception:
            pass
        return True

    def save(self, query_runner):
        rows_count = 0
        sample_rows_count = 0
        try:
            with jsonlines.open(self._get_file_path(), mode='w', dumps=query_runner.json_dumps) as writer:
                # loop and write to file
                json_row = query_runner.get_row()
                while json_row is not None:
                    writer.write(json_row)
                    rows_count += 1
                    json_row = query_runner.get_row()

        except Exception:
            self._silent_remove(self._get_file_path())
            raise

        self.data['rows_count'] = rows_count
        self.data['sample_rows_count'] = sample_rows_count
        self.data['sample_rows'] = {}
        self.data['columns'] = query_runner.columns

        return self.data

    @staticmethod
    def _silent_remove(filename):
        try:
            os.remove(filename)
        except OSError:
            pass

    def get(self):
        rows = []
        with jsonlines.open(self._get_file_path(), loads=json_loads) as reader:
            for row in reader:
                rows.append(row)

        data = {'columns': self.data['columns'], 'rows': rows}
        return data or {}

    # def get_as_csv_stream(self): ?????
    # def get_as_excel_stream(self): ?????
    # def get_as_json_stream(self): ?????
    # def get_as_stream(self)

    def _get_file_path(self):
        if not os.path.exists(settings.QUERY_RESULTS_STORAGE_FILE_DIR):
            os.makedirs(settings.QUERY_RESULTS_STORAGE_FILE_DIR)
        return os.path.join(settings.QUERY_RESULTS_STORAGE_FILE_DIR, self.filename)


class QueryResultDataFactory(object):

    @staticmethod
    def get_resultdatahandler(data=None, **kwargs):
        result_data_handlers = {
            "db": QueryResultDbData,
            "file": QueryResultFileData,
            # "s3": QueryResultS3Data  @TODO ??
        }
        # @TODO IMPROVEMENT save data_handler in query_results.data_handler column.
        # @TODO IMPROVEMENT that way we can avoid searching it in data! and maybe gain some performance
        data_handler = 'db'
        if data is None:
            data_handler = settings.QUERY_RESULTS_STORAGE_TYPE or 'db'
        else:
            if type(data) in (str, unicode):
                data = json_loads(data)

            if 'data_handler' in data:
                data_handler = data.get('data_handler', None)

        if data_handler is None:
            raise Exception('Unknown data_handler!!')

        # set storage type for query_result.data object
        __data_handler_class = result_data_handlers.get(data_handler)
        # init the class responsible of handling result_data
        logging.info("Using (%s) class as result data handler!", __data_handler_class)
        return __data_handler_class(data, **kwargs)
