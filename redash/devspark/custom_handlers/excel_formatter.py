import xlsxwriter
import tempfile
from flask import Flask, request, make_response
from flask_login import login_required
from redash.wsgi import app

@app.route('/api/dashboard/generate_excel', methods=['POST'])
def get_tasks():
    app.logger.debug(request.json)

    data = request.json

    with tempfile.NamedTemporaryFile() as tmp_flo:
        workbook = xlsxwriter.Workbook(tmp_flo.name)

        # Add a bold format to use to highlight cells.
        format1 = workbook.add_format({
            'bold': True,
            'font_color': 'white',
            'bg_color': 'black',
            'border': True})
        format2 = workbook.add_format({'border': True})

        # For each widget to be exported, creates a new sheet
        page_count = 0
        for sheet in data['data']:
            sheet_name = "%s_%s" % (page_count, sheet['option']['sheet'])
            page_count += 1
            worksheet = workbook.add_worksheet(sheet_name[:31])
     
            rowIdx = 0
            colIdx = 0
            # Defines the header
            for column in sheet['option']['columnNames']:
                worksheet.write(rowIdx, colIdx, column, format1)
                colIdx +=1
            # Writes each row for each column
            for row in sheet['data']:
                colIdx = 0
                rowIdx +=1
                for column in sheet['option']['columnNames']:
                    worksheet.write(rowIdx, colIdx, row[column], format2)
                    worksheet.set_column(rowIdx, colIdx, 25)
                    colIdx +=1

        workbook.close()
        tmp_flo.flush()
        contents = tmp_flo.read()

    response = make_response(contents)
    filename = "%s.xlsx" % data['name']
    response.headers['Content-Disposition'] = 'attachment; filename=%s' % filename
    response.headers['Content-type'] = ('application/vnd.openxmlformats-'
                                        'officedocument.spreadsheetml.sheet')
    response.headers['Content-Description'] = 'File Transfer'
    response.headers['Content-Transfer-Encoding'] = 'binary'
    return response
