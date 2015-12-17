import peewee
from redash.models import BaseModel
from redash.models import User
from redash.models import Dashboard

class Favourite(BaseModel):
    DEFAULT_PERMISSIONS = ['create_dashboard', 'create_query', 'edit_dashboard', 'edit_query',
                           'view_query', 'view_source', 'execute_query', 'list_users']

    id = peewee.PrimaryKeyField()
    user = peewee.ForeignKeyField(User)
    dashboard = peewee.ForeignKeyField(Dashboard)

    class Meta:
        db_table = 'favourites'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'dashboard_id': self.dashboard_id
        }

    def __unicode__(self):
        return unicode(self.id)