import functools

from flask_sqlalchemy import BaseQuery, SQLAlchemy
from sqlalchemy.orm import object_session
from sqlalchemy.pool import NullPool
from sqlalchemy_searchable import make_searchable, vectorizer, SearchQueryMixin

from redash import settings
from redash.utils import json_dumps


class RedashSQLAlchemy(SQLAlchemy):
    def apply_driver_hacks(self, app, info, options):
        options.update(json_serializer=json_dumps)
        super(RedashSQLAlchemy, self).apply_driver_hacks(app, info, options)

    def apply_pool_defaults(self, app, options):
        super(RedashSQLAlchemy, self).apply_pool_defaults(app, options)
        if settings.SQLALCHEMY_DISABLE_POOL:
            options["poolclass"] = NullPool
            # Remove options NullPool does not support:
            options.pop("max_overflow", None)


db = RedashSQLAlchemy(session_options={"expire_on_commit": False})
# Make sure the SQLAlchemy mappers are all properly configured first.
# This is required by SQLAlchemy-Searchable as it adds DDL listeners
# on the configuration phase of models.
db.configure_mappers()

# listen to a few database events to set up functions, trigger updates
# and indexes for the full text search
make_searchable(options={"regconfig": "pg_catalog.simple"})


class SearchBaseQuery(BaseQuery, SearchQueryMixin):
    """
    The SQA query class to use when full text search is wanted.
    """


@vectorizer(db.Integer)
def integer_vectorizer(column):
    return db.func.cast(column, db.Text)


Column = functools.partial(db.Column, nullable=False)

# AccessPermission and Change use a 'generic foreign key' approach to refer to
# either queries or dashboards.
# TODO replace this with association tables.
_gfk_types = {}


def gfk_type(cls):
    _gfk_types[cls.__tablename__] = cls
    return cls


class GFKBase(object):
    """
    Compatibility with 'generic foreign key' approach Peewee used.
    """

    object_type = Column(db.String(255))
    object_id = Column(db.Integer)

    _object = None

    @property
    def object(self):
        session = object_session(self)
        if self._object or not session:
            return self._object
        else:
            object_class = _gfk_types[self.object_type]
            self._object = (
                session.query(object_class)
                .filter(object_class.id == self.object_id)
                .first()
            )
            return self._object

    @object.setter
    def object(self, value):
        self._object = value
        self.object_type = value.__class__.__tablename__
        self.object_id = value.id
