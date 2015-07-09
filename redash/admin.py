import json
from flask_admin.contrib.peewee import ModelView
from flask.ext.admin import Admin
from flask_admin.contrib.peewee.form import CustomModelConverter
from flask_admin.form.widgets import DateTimePickerWidget
from playhouse.postgres_ext import ArrayField, DateTimeTZField
from wtforms import fields
from wtforms.widgets import TextInput

from redash import models
from redash import query_runner
from redash.permissions import require_permission


class ArrayListField(fields.Field):
    widget = TextInput()

    def _value(self):
        if self.data:
            return u', '.join(self.data)
        else:
            return u''

    def process_formdata(self, valuelist):
        if valuelist:
            self.data = [x.strip() for x in valuelist[0].split(',')]
        else:
            self.data = []


class JSONTextAreaField(fields.TextAreaField):
    def process_formdata(self, valuelist):
        if valuelist:
            try:
                json.loads(valuelist[0])
            except ValueError:
                raise ValueError(self.gettext(u'Invalid JSON'))
            self.data = valuelist[0]
        else:
            self.data = ''

class PasswordHashField(fields.PasswordField):
    def _value(self):
        return u''

    def process_formdata(self, valuelist):
        if valuelist:
            self.data = models.pwd_context.encrypt(valuelist[0])
        else:
            self.data = u''


class PgModelConverter(CustomModelConverter):
    def __init__(self, view, additional=None):
        additional = {ArrayField: self.handle_array_field,
                      DateTimeTZField: self.handle_datetime_tz_field,
                      }
        super(PgModelConverter, self).__init__(view, additional)
        self.view = view

    def handle_array_field(self, model, field, **kwargs):
        return field.name, ArrayListField(**kwargs)

    def handle_datetime_tz_field(self, model, field, **kwargs):
        kwargs['widget'] = DateTimePickerWidget()
        return field.name, fields.DateTimeField(**kwargs)


class BaseModelView(ModelView):
    model_form_converter = PgModelConverter

    @require_permission('admin')
    def is_accessible(self):
        return True


class UserModelView(BaseModelView):
    column_searchable_list = ('name', 'email')
    form_excluded_columns = ('created_at', 'updated_at')
    column_exclude_list = ('password_hash',)

    form_overrides = dict(password_hash=PasswordHashField)
    form_args = {
        'password_hash': {'label': 'Password'}
    }


def query_runner_type_formatter(view, context, model, name):
    qr = query_runner.query_runners.get(model.type, None)
    if qr:
        return qr.name()

    return model.type


class DataSourceModelView(BaseModelView):
    form_overrides = dict(type=fields.SelectField, options=JSONTextAreaField)
    form_args = dict(type={
        'choices': [(k, r.name()) for k, r in query_runner.query_runners.iteritems()]
    })
    column_formatters = dict(type=query_runner_type_formatter)
    column_filters = ('type',)


def init_admin(app):
    admin = Admin(app, name='re:dash admin')

    admin.add_view(UserModelView(models.User))
    admin.add_view(DataSourceModelView(models.DataSource))

    for m in (models.QueryResult, models.Query, models.Dashboard, models.Visualization, models.Widget, models.ActivityLog, models.Group, models.Event):
        admin.add_view(BaseModelView(m))
