import json
import jinja2
import shutil
import os.path
import tempfile
from flask.ext.mail import Message
from celery.utils.log import get_task_logger
from redash import models, mail
from redash.worker import celery
from redash.devspark import excel_reports
from redash.query_runner import get_query_runner

logger = get_task_logger(__name__)


def dr2fn(date_range):
    """
    Uses the start date and end date, to generate a filename-friendly string.

    :param date_range: Dictionary with 'start' and 'end' keys.
    """
    return (
        date_range.get('start', '').split('T')[0].replace('-', '') + '_' +
        date_range.get('end', '').split('T')[0].replace('-', '') + '.xlsx'
    )


def report_name(widget):
    """
    Returns the report name for a specific widget object.

    :param widget: peewee ORM Widget object.
    """
    try:
        return json.loads(widget.options)['exportable']['name']
    except:
        return ''


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
        .select(models.Widget, models.Visualization, models.Query, models.DataSource)
        .join(models.Visualization).join(models.Query).join(models.DataSource)
        .where(models.Widget.id << [w['id'] for w in widgets])
        .execute()
    )

    report_buffers = {}

    # Normalize query parameters
    qp = {
        key[2:] if key.startswith('p_') else key: query_params[key]
        for key in query_params.keys()
    }

    for date_range in date_ranges:
        # FIXME: This is a cadorcha. The dates should be parsed into
        # datetime objects and the date properly extracted
        qp['startdate'] = date_range['start'].split('T')[0]
        qp['enddate'] = date_range['end'].split('T')[0]

        report = excel_reports.ExcelReport()
        report.add_cover(
            qp,  # No filters FIXME
            ["%s_%s" % (report_name(widget), index)
             for index, widget in enumerate(db_widgets)]
        )

        for index, widget in enumerate(db_widgets):
            # Get the query runner instance for the Data Source corresponding to
            # the query about to be executed
            query_runner = get_query_runner(
                widget.visualization.query.data_source.type,
                widget.visualization.query.data_source.options
            )

            # We need to build a jinja2 template in order to instantiate a query
            # with a certain date range
            query_template = jinja2.Template(widget.visualization.query.query)

            # Run the query using those parameters.
            data, error = query_runner.run_query(query_template.render(**qp))

            if error:
                logger.error(error)

            report.add_sheet(
                report_name(widget),
                next(w['columnNames'] for w in widgets if w['id'] == widget.id),
                json.loads(data)['rows'],
                widget.visualization.query.description,
                True
            )

        report_buffers[dr2fn(date_range)] = report.finish().getvalue()

    # No context manager available for temporary folders in Python 2.x, so
    # we wrap the execution within a try-finally set of clauses
    try:
        tempdir = tempfile.mkdtemp()

        fns = []
        for dr, buf in report_buffers.iteritems():
            # Dump the content of the buffer into a .xlsx file inside the
            # temporary folder
            with open(os.path.join(tempdir, dr), 'w') as tf:
                tf.write(buf)
            fns.append(os.path.join(tempdir, dr))

        # Send zipped reports to requester's email.
        # This is imported here, because it will be executed on the context
        # of the celery task. If imported at the beginning of the file, it
        # causes a circular dependency which results in the whole
        # application crashing,
        # PLEASE DO NOT FIX IT :)
        from redash.wsgi import app
        with app.app_context():
            message = Message(
                recipients=[email],
                subject="Mansion Global Analytics requested reports",
                html='Hi,<br><br>Please find attached the requested reports.'
            )

            # Attach all reports to message:
            for report_fn in fns:
                with open(report_fn, 'r') as flo:
                    message.attach(
                        report_fn.split(os.path.sep)[-1],
                        'application/zip',
                        flo.read()
                    )

            # Send the e-mail
            mail.send(message)
            logger.info('Mail sent!')
    finally:
        # Clear all temporary files & folders
        shutil.rmtree(tempdir)
        tf.close()
