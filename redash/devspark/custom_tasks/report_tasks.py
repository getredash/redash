import json
import shutil
import os.path
import tempfile
from celery.utils.log import get_task_logger
from redash import models
from redash.worker import celery
from redash.devspark import excel_reports
from redash.devspark.custom_tasks.report_tasks_helpers import dr2fn
from redash.devspark.custom_tasks.report_tasks_helpers import report_name
from redash.devspark.custom_tasks.report_tasks_helpers import send_reports
from redash.devspark.custom_tasks.report_tasks_helpers import get_widget_rows


logger = get_task_logger(__name__)


@celery.task
def reports_by_month_task(date_ranges, start_date_param, end_date_param,
                          widgets, query_params, email):
    """
    Creates a series Excel reports (one per date range), each one with one sheet
    per widget.

    :param date_ranges: TODO
    :param start_date_param: Start date parameter name
    :param end_date_param: End date parameter name
    :param query_ids: Ids of the queries that will be executed in each report.
    :param query_params: Query parameters (will be applied to all queries).
    :param email: Email where the zipped reports will be sent to.
    """
    logger.error('XLS Report task started...')

    # Retrieve all the about to be imported widgets from the database
    db_widgets = (
        models.Widget
        .select(models.Widget, models.Visualization,
                models.Query, models.DataSource)
        .join(models.Visualization).join(models.Query).join(models.DataSource)
        .where(models.Widget.id << [w['id'] for w in widgets])
        .execute()
    )

    # Normalize query parameters
    qp = {
        key[2:] if key.startswith('p_') else key: query_params[key]
        for key in query_params.keys()
    }

    report_buffers = {}
    for date_range in date_ranges:
        # FIXME: This is a cadorcha. The dates should be parsed into
        # datetime objects and the date properly extracted
        qp['startdate'] = date_range['start'].split('T')[0]
        qp['enddate'] = date_range['end'].split('T')[0]

        # Create a new excel report for the current date range, add a cover.
        report = excel_reports.ExcelReport()
        report.add_cover(
            qp,
            ["%s_%s" % (report_name(w), i) for i, w in enumerate(db_widgets)]
        )

        # Add a sheet to the current report for every selected widget
        for index, widget in enumerate(db_widgets):
            # Execute the query associated to the widget and retrive the
            # resulting rows
            data, error = get_widget_rows(widget, qp)
            if error:
                logger.error(error)

            # Add a sheet to the workbook with the widget's query results.
            report.add_sheet(
                report_name(widget),
                next(w['columnNames'] for w in widgets if w['id'] == widget.id),
                json.loads(data)['rows'],
                widget.visualization.query.description,
                True
            )

        # Store the generated workbook in an in-memory buffer
        report_buffers[dr2fn(date_range)] = report.finish().getvalue()

    # No context manager available for temporary folders in Python 2.x, so
    # we wrap the execution within a try-finally set of clauses
    try:
        # Dump the content of each buffer into a .xlsx file inside a temporary
        # folder
        tempdir = tempfile.mkdtemp()
        fns = []
        for dr, buf in report_buffers.iteritems():
            with open(os.path.join(tempdir, dr), 'w') as tf:
                tf.write(buf)
            fns.append(os.path.join(tempdir, dr))

        send_reports(email, fns)
        logger.info('Mail sent!')
    finally:
        # Clear all temporary files & folders
        shutil.rmtree(tempdir)
        tf.close()
