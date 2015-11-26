import logging
import xlsxwriter
import tempfile

from flask import Flask, jsonify, request, make_response
from flask_login import login_required
from redash.wsgi import app

@app.route('/api/dashboard/generate_excel', methods=['POST'])
def get_tasks():
    # logging.error(request.json)
    logger = logging.getLogger()
    logger.debug(request.json)

    data = request.json

    with tempfile.NamedTemporaryFile() as tmp_flo:
        workbook = xlsxwriter.Workbook(tmp_flo.name)

        for sheet in data['data']:
            worksheet = workbook.add_worksheet(sheet['option']['sheet'])
            rowIdx = 0
            colIdx = 0
            for column in sheet['option']['columnNames']:
                worksheet.write_string(rowIdx, colIdx, column)
                colIdx +=1

            for row in sheet['data']:
                colIdx = 0
                rowIdx +=1
                for column in sheet['option']['columnNames']:
                    worksheet.write(rowIdx, colIdx, row[column])
                    colIdx +=1

        workbook.close()
        tmp_flo.flush()
        contents = tmp_flo.read()

    response = make_response(contents)
    filename = "%s.xlsx" % data['name']
    response.headers['Content-Disposition'] = 'attachment; filename=%s' % filename
    response.headers['Content-type'] = ('application/vnd.openxmlformats-'
                                        'officedocument.spreadsheetml.sheet')
    return response

