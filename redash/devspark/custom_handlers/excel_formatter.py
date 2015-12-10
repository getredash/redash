import xlsxwriter
import tempfile
import datetime
from flask import Flask, request, make_response
from flask_login import login_required
from redash.wsgi import app

def generate_first_page(workbook, filters, reports):
    titleFormat = workbook.add_format({
        'bold': True,
        'font_size': 20,
        'align': 'center',
        'valign': 'vcenter',
        'bottom': 5,
        'font_name': 'Times New Roman'
        })

    descriptionFormat = workbook.add_format({
        'font_size': 16,
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Times New Roman'
        })

    bold = workbook.add_format({
        'bold': True,
        'font_name': 'Times New Roman'
        })

    # Add a format to use wrap the cell text.
    wrap = workbook.add_format({
        'text_wrap': True, 
        'align': 'right',
        'valign': 'top',
        'font_size': 9,
        'font_name': 'Times New Roman'
        })

    center = workbook.add_format({
        'align': 'center',
        'font_name': 'Times New Roman'
        })

    left = workbook.add_format({
        'align': 'left',
        'font_name': 'Times New Roman'
        })

    right = workbook.add_format({
        'align': 'right',
        'font_name': 'Times New Roman'
        })

    font = workbook.add_format({
        'font_name': 'Times New Roman'
        })

    day_left = workbook.add_format({
        'align': 'left', 
        'num_format': 'mmmm d yyyy',
        'font_name': 'Times New Roman'
        })

    day_right = workbook.add_format({
        'align': 'right', 
        'num_format': 'mmmm d yyyy',
        'font_name': 'Times New Roman'
        })

    worksheet = workbook.add_worksheet('Details')

    # Columns
    worksheet.set_column(0, 0, 40)
    worksheet.set_column(1, 1, 3)
    worksheet.set_column(2, 2, 15)
    worksheet.set_column(3, 3, 15)
    worksheet.set_column(4, 4, 13)

    # Row 0
    worksheet.set_row(0, 35)
    worksheet.write(0, 0, 'MANSION GLOBAL', titleFormat)

    worksheet.merge_range(0, 2, 0, 4, 'For any queries about this report please contact your local sales representative', wrap);
    
    # Row 1
    worksheet.set_row(1, 25)
    worksheet.write(1, 0, 'ONLY THE EXCEPTION', descriptionFormat)

    # Row 3
    worksheet.write(3, 0, '1211 Ave of the Americas New York, NY 10036', font)
    worksheet.write(3, 2, 'Report Generated on:', right)

    d = datetime.datetime.now()
    worksheet.write(3, 3, d, day_right)

    # Row 5
    worksheet.write(6, 0, 'Reports', bold)
    worksheet.write(6, 2, 'Filters Applied', bold)

    # Reports Exported
    colIdx = 0
    rowIdx = 7
    for report in reports:
        worksheet.write(rowIdx, colIdx, report, font)
        rowIdx += 1

    #worksheet.write(7, 0, 'Selected Development View', font)
    #worksheet.write(8, 0, 'Developments Units', font)
    #worksheet.write(9, 0, 'Development Views By MOD as Col', font)
    #worksheet.write(10, 0, 'Development Leads', font)
    #worksheet.write(11, 0, 'Development Views By MOD', font)

    # Filters Applied
    colIdx = 2
    rowIdx = 7
    for row in filters['data']:
        for column in filters['columnNames']:
            worksheet.write(rowIdx, colIdx, row[column], font)
            colIdx += 1
        rowIdx += 1
        colIdx = 2

    #worksheet.write(7, 2, 42309, day_right)
    #worksheet.write(7, 3, 'to', center)
    #worksheet.write(7, 4, 42338, day_left)
    
    #worksheet.write(8, 2, 'Marketing Group', right)
    #worksheet.write(8, 4, 'Sothebys', left)

    return

@app.route('/api/dashboard/generate_excel', methods=['POST'])
def get_tasks():
    app.logger.debug(request.json)

    data = request.json

    with tempfile.NamedTemporaryFile() as tmp_flo:
        workbook = xlsxwriter.Workbook(tmp_flo.name)

        # First page of XLS
        generate_first_page(workbook, data['filters'], data['reports'])

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
            _filter = sheet['option'].get('autofilter', None)

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
            # Adds autofilter on all columns if 'option.filter' is defined as true
            if _filter:
                worksheet.autofilter(0, 0, len(sheet['data']), len(sheet['option']['columnNames']))
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
