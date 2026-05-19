import functools

from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.query import Query
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import object_session
from sqlalchemy.pool import NullPool
from sqlalchemy_searchable import SearchQueryMixin, make_searchable, vectorizer

from redash import settings
from redash.utils import json_dumps, json_loads


class RedashSQLAlchemy(SQLAlchemy):
    def apply_driver_hacks(self, app, info, options):
        options.update(json_serializer=json_dumps)
        if settings.SQLALCHEMY_ENABLE_POOL_PRE_PING:
            options.update(pool_pre_ping=True)
        return super(RedashSQLAlchemy, self).apply_driver_hacks(app, info, options)

    def apply_pool_defaults(self, app, options):
        super(RedashSQLAlchemy, self).apply_pool_defaults(app, options)
        if settings.SQLALCHEMY_ENABLE_POOL_PRE_PING:
            options["pool_pre_ping"] = True
        if settings.SQLALCHEMY_DISABLE_POOL:
            options["poolclass"] = NullPool
            # Remove options NullPool does not support:
            options.pop("max_overflow", None)
        return options


db = RedashSQLAlchemy(
    session_options={"expire_on_commit": False},
    engine_options={"json_serializer": json_dumps, "json_deserializer": json_loads},
)

# listen to a few database events to set up functions, trigger updates
# and indexes for the full text search
make_searchable(db.metadata, options={"regconfig": "pg_catalog.simple"})


class SearchBaseQuery(Query, SearchQueryMixin):
    """
    The SQA query class to use when full text search is wanted.
    """

    @property
    def _entities(self):
        """
        Compatibility property for sqlalchemy-searchable with SQLAlchemy 1.4+
        The _entities attribute was removed in SQLAlchemy 1.4, but sqlalchemy-searchable
        still tries to access it. This property provides backwards compatibility.
        """
        # Try to get entities from column_descriptions
        if hasattr(self, "column_descriptions"):
            # Create a fake _entities list that mimics the old structure
            class FakeEntity:
                def __init__(self, entity_data):
                    self.entity_zero = type(
                        "obj", (object,), {"class_": entity_data.get("entity") or entity_data.get("type")}
                    )()

            return [FakeEntity(desc) for desc in self.column_descriptions]
        return []


@vectorizer(db.Integer)
def integer_vectorizer(column):
    return db.func.cast(column, db.Text)


@vectorizer(UUID)
def uuid_vectorizer(column):
    return db.func.cast(column, db.Text)


Column = functools.partial(db.Column, nullable=False)

# AccessPermission and Change use a 'generic foreign key' approach to refer to
# either queries or dashboards.
# TODO replace this with association tables.
_gfk_types = {}


def gfk_type(cls):
    _gfk_types[cls.__tablename__] = cls
    return cls


class GFKBase:
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
            self._object = session.query(object_class).filter(object_class.id == self.object_id).first()
            return self._object

    @object.setter
    def object(self, value):
        self._object = value
        self.object_type = value.__class__.__tablename__
        self.object_id = value.id


key_definitions = settings.dynamic_settings.database_key_definitions((db.Integer, {}))


def key_type(name):
    return key_definitions[name][0]


def primary_key(name):
    key_type, kwargs = key_definitions[name]
    return Column(key_type, primary_key=True, **kwargs)
