import os
import json
import jinja2
from redash.query_runner import get_query_runner
from redash import mail
from flask.ext.mail import Message


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


def send_reports(email, fns):
    """
    Builds a message within the application's context, attaches all the XLSX
    reports references in fns and sends them to the specified email.

    :param email: Destination email address.
    :param fns: Filenames of reports to attach.
    """
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


def get_widget_rows(widget, qp):
    """
    Executes the query associated with the widget and returns the resulting rows
    and errors (if any).

    :param widget: peeewee ORM Widget instance.
    :param qp: Dictionary containing query parameters to instantiate de jinja2
      query template.

    :returns: a tuple (data, error)
    """
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
    return query_runner.run_query(query_template.render(**qp))
