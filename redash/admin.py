import json
from flask_admin import Admin
from flask_admin.base import MenuLink
from flask_admin.contrib.peewee import ModelView
from flask_admin.contrib.peewee.form import CustomModelConverter
from flask_admin.form.widgets import DateTimePickerWidget
from playhouse.postgres_ext import ArrayField, DateTimeTZField
from wtforms import fields
from wtforms.widgets import TextInput

from redash import models
from redash.permissions import require_super_admin


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


class PgModelConverter(CustomModelConverter):
    def __init__(self, view, additional=None):
        additional = {ArrayField: self.handle_array_field,
                      DateTimeTZField: self.handle_datetime_tz_field,
                      models.JSONField: self.handle_json_field,
                      }
        super(PgModelConverter, self).__init__(view, additional)
        self.view = view

    def handle_json_field(self, model, field, **kwargs):
        return field.name, JSONTextAreaField(**kwargs)

    def handle_array_field(self, model, field, **kwargs):
        return field.name, ArrayListField(**kwargs)

    def handle_datetime_tz_field(self, model, field, **kwargs):
        kwargs['widget'] = DateTimePickerWidget()
        return field.name, fields.DateTimeField(**kwargs)


class BaseModelView(ModelView):
    column_display_pk = True
    model_form_converter = PgModelConverter

    @require_super_admin
    def is_accessible(self):
        return True


class QueryResultModelView(BaseModelView):
    column_exclude_list = ('data',)


class QueryModelView(BaseModelView):
    column_exclude_list = ('latest_query_data',)


class DashboardModelView(BaseModelView):
    column_searchable_list = ('name', 'slug')


def init_admin(app):
    admin = Admin(app, name='re:dash admin', template_mode='bootstrap3')

    admin.add_view(QueryModelView(models.Query))
    admin.add_view(QueryResultModelView(models.QueryResult))
    admin.add_view(DashboardModelView(models.Dashboard))
    logout_link = MenuLink('Logout', '/logout', 'logout')

    for m in (models.Visualization, models.Widget, models.Event, models.Organization):
        admin.add_view(BaseModelView(m))

    admin.add_link(logout_link)
