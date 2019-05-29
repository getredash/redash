import cStringIO
import csv
import xlsxwriter
from dateutil.parser import parse as parse_date
from redash.utils import json_loads, UnicodeWriter
from redash.query_runner import (TYPE_BOOLEAN, TYPE_DATE, TYPE_DATETIME)
from redash.authentication.org_resolving import current_org


def convert_format(fmt):
    return fmt.replace('DD', '%d').replace('MM', '%m').replace('YYYY', '%Y').replace('YY', '%y').replace('HH', '%H').replace('mm', '%M').replace('ss', '%s')


def _get_column_lists(columns):
    fieldnames = []
    bool_columns = []
    date_columns = []
    datetime_columns = []

    for col in columns:
        fieldnames.append(col['name'])
        if col['type'] == TYPE_BOOLEAN:
            bool_columns.append(col['name'])
        elif col['type'] == TYPE_DATE:
            date_columns.append(col['name'])
        elif col['type'] == TYPE_DATETIME:
            datetime_columns.append(col['name'])
    
    return fieldnames, bool_columns, date_columns, datetime_columns


def serialize_query_result_to_csv(query_result):
    s = cStringIO.StringIO()

    query_data = json_loads(query_result.data)

    fieldnames, bool_columns, date_columns, datetime_columns = _get_column_lists(query_data['columns'])

    writer = csv.DictWriter(s, extrasaction="ignore", fieldnames=fieldnames)
    writer.writer = UnicodeWriter(s)
    writer.writeheader()

    for row in query_data['rows']:
        for col in bool_columns:
            if col in row:
                if row[col] is True:
                    row[col] = "true"
                elif row[col] is False:
                    row[col] = "false"
        
        for col in date_columns:
            if not row[col]:
                continue

            if col in row:
                parsed = parse_date(row[col])

                row[col] = parsed.strftime(convert_format(current_org.get_setting('date_format')))

        for col in datetime_columns:
            if not row[col]:
                continue

            if col in row:
                parsed = parse_date(row[col])

                fmt = convert_format('{} {}'.format(current_org.get_setting('date_format'), current_org.get_setting('time_format')))
                row[col] = parsed.strftime(fmt)

        writer.writerow(row)

    return s.getvalue()


def serialize_query_result_to_xlsx(query_result):
    s = cStringIO.StringIO()

    query_data = json_loads(query_result.data)
    book = xlsxwriter.Workbook(s, {'constant_memory': True})
    sheet = book.add_worksheet("result")

    column_names = []
    for (c, col) in enumerate(query_data['columns']):
        sheet.write(0, c, col['name'])
        column_names.append(col['name'])

    for (r, row) in enumerate(query_data['rows']):
        for (c, name) in enumerate(column_names):
            v = row.get(name)
            if isinstance(v, list) or isinstance(v, dict):
                v = str(v).encode('utf-8')
            sheet.write(r + 1, c, v)

    book.close()

    return s.getvalue()
