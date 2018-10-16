import cStringIO
import csv
import datetime
import functools
import hashlib
import itertools
import logging
import time
from functools import reduce

from six import python_2_unicode_compatible, string_types, text_type
import xlsxwriter
from flask import current_app as app, url_for
from flask_login import AnonymousUserMixin, UserMixin
from flask_sqlalchemy import SQLAlchemy, BaseQuery
from passlib.apps import custom_app_context as pwd_context

from redash import settings, redis_connection, utils
from redash.destinations import (get_configuration_schema_for_destination_type,
                                 get_destination)
from redash.metrics import database  # noqa: F401
from redash.query_runner import (get_configuration_schema_for_query_runner_type,
                                 get_query_runner)
from redash.utils import generate_token, json_dumps, json_loads
from redash.utils.configuration import ConfigurationContainer
from redash.settings.organization import settings as org_settings

from sqlalchemy import distinct, or_, and_, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.event import listens_for
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import backref, contains_eager, joinedload, object_session
from sqlalchemy.orm.exc import NoResultFound  # noqa: F401
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import func
from sqlalchemy_searchable import SearchQueryMixin, make_searchable, vectorizer
from sqlalchemy_utils import generic_relationship, EmailType
from sqlalchemy_utils.types import TSVectorType


class SQLAlchemyExt(SQLAlchemy):
    def apply_pool_defaults(self, app, options):
        if settings.SQLALCHEMY_DISABLE_POOL:
            from sqlalchemy.pool import NullPool
            options['poolclass'] = NullPool
        else:
            return super(SQLAlchemyExt, self).apply_pool_defaults(app, options)


db = SQLAlchemyExt(session_options={
    'expire_on_commit': False
})
# Make sure the SQLAlchemy mappers are all properly configured first.
# This is required by SQLAlchemy-Searchable as it adds DDL listeners
# on the configuration phase of models.
db.configure_mappers()

# listen to a few database events to set up functions, trigger updates
# and indexes for the full text search
make_searchable(options={'regconfig': 'pg_catalog.simple'})


class SearchBaseQuery(BaseQuery, SearchQueryMixin):
    """
    The SQA query class to use when full text search is wanted.
    """


Column = functools.partial(db.Column, nullable=False)


class ScheduledQueriesExecutions(object):
    KEY_NAME = 'sq:executed_at'

    def __init__(self):
        self.executions = {}

    def refresh(self):
        self.executions = redis_connection.hgetall(self.KEY_NAME)

    def update(self, query_id):
        redis_connection.hmset(self.KEY_NAME, {
            query_id: time.time()
        })

    def get(self, query_id):
        timestamp = self.executions.get(str(query_id))
        if timestamp:
            timestamp = utils.dt_from_timestamp(timestamp)

        return timestamp


scheduled_queries_executions = ScheduledQueriesExecutions()

# AccessPermission and Change use a 'generic foreign key' approach to refer to
# either queries or dashboards.
# TODO replace this with association tables.
_gfk_types = {}


class GFKBase(object):
    """
    Compatibility with 'generic foreign key' approach Peewee used.
    """
    # XXX Replace this with table-per-association.
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
            self._object = session.query(object_class).filter(
                object_class.id == self.object_id).first()
            return self._object

    @object.setter
    def object(self, value):
        self._object = value
        self.object_type = value.__class__.__tablename__
        self.object_id = value.id


# XXX replace PseudoJSON and MutableDict with real JSON field
class PseudoJSON(TypeDecorator):
    impl = db.Text

    def process_bind_param(self, value, dialect):
        return json_dumps(value)

    def process_result_value(self, value, dialect):
        if not value:
            return value
        return json_loads(value)


class MutableDict(Mutable, dict):
    @classmethod
    def coerce(cls, key, value):
        "Convert plain dictionaries to MutableDict."

        if not isinstance(value, MutableDict):
            if isinstance(value, dict):
                return MutableDict(value)

            # this call will raise ValueError
            return Mutable.coerce(key, value)
        else:
            return value

    def __setitem__(self, key, value):
        "Detect dictionary set events and emit change events."

        dict.__setitem__(self, key, value)
        self.changed()

    def __delitem__(self, key):
        "Detect dictionary del events and emit change events."

        dict.__delitem__(self, key)
        self.changed()


class MutableList(Mutable, list):
    def append(self, value):
        list.append(self, value)
        self.changed()

    def remove(self, value):
        list.remove(self, value)
        self.changed()

    @classmethod
    def coerce(cls, key, value):
        if not isinstance(value, MutableList):
            if isinstance(value, list):
                return MutableList(value)
            return Mutable.coerce(key, value)
        else:
            return value


class TimestampMixin(object):
    updated_at = Column(db.DateTime(True), default=db.func.now(),
                           onupdate=db.func.now(), nullable=False)
    created_at = Column(db.DateTime(True), default=db.func.now(),
                           nullable=False)


class ChangeTrackingMixin(object):
    skipped_fields = ('id', 'created_at', 'updated_at', 'version')
    _clean_values = None

    def __init__(self, *a, **kw):
        super(ChangeTrackingMixin, self).__init__(*a, **kw)
        self.record_changes(self.user)

    def prep_cleanvalues(self):
        self.__dict__['_clean_values'] = {}
        for attr in inspect(self.__class__).column_attrs:
            col, = attr.columns
            # 'query' is col name but not attr name
            self._clean_values[col.name] = None

    def __setattr__(self, key, value):
        if self._clean_values is None:
            self.prep_cleanvalues()
        for attr in inspect(self.__class__).column_attrs:
            col, = attr.columns
            previous = getattr(self, attr.key, None)
            self._clean_values[col.name] = previous

        super(ChangeTrackingMixin, self).__setattr__(key, value)

    def record_changes(self, changed_by):
        db.session.add(self)
        db.session.flush()
        changes = {}
        for attr in inspect(self.__class__).column_attrs:
            col, = attr.columns
            if attr.key not in self.skipped_fields:
                changes[col.name] = {'previous': self._clean_values[col.name],
                                     'current': getattr(self, attr.key)}

        db.session.add(Change(object=self,
                              object_version=self.version,
                              user=changed_by,
                              change=changes))


class BelongsToOrgMixin(object):
    @classmethod
    def get_by_id_and_org(cls, object_id, org):
        return db.session.query(cls).filter(cls.id == object_id, cls.org == org).one()


class PermissionsCheckMixin(object):
    def has_permission(self, permission):
        return self.has_permissions((permission,))

    def has_permissions(self, permissions):
        has_permissions = reduce(lambda a, b: a and b,
                                 map(lambda permission: permission in self.permissions,
                                     permissions),
                                 True)

        return has_permissions


class AnonymousUser(AnonymousUserMixin, PermissionsCheckMixin):
    @property
    def permissions(self):
        return []

    def is_api_user(self):
        return False


class ApiUser(UserMixin, PermissionsCheckMixin):
    def __init__(self, api_key, org, groups, name=None):
        self.object = None
        if isinstance(api_key, string_types):
            self.id = api_key
            self.name = name
        else:
            self.id = api_key.api_key
            self.name = "ApiKey: {}".format(api_key.id)
            self.object = api_key.object
        self.group_ids = groups
        self.org = org

    def __repr__(self):
        return u"<{}>".format(self.name)

    def is_api_user(self):
        return True

    @property
    def permissions(self):
        return ['view_query']

    def has_access(self, obj, access_type):
        return False


@python_2_unicode_compatible
class Organization(TimestampMixin, db.Model):
    SETTING_GOOGLE_APPS_DOMAINS = 'google_apps_domains'
    SETTING_IS_PUBLIC = "is_public"

    id = Column(db.Integer, primary_key=True)
    name = Column(db.String(255))
    slug = Column(db.String(255), unique=True)
    settings = Column(MutableDict.as_mutable(PseudoJSON))
    groups = db.relationship("Group", lazy="dynamic")
    events = db.relationship("Event", lazy="dynamic", order_by="desc(Event.created_at)",)


    __tablename__ = 'organizations'

    def __repr__(self):
        return u"<Organization: {}, {}>".format(self.id, self.name)

    def __str__(self):
        return u'%s (%s)' % (self.name, self.id)

    @classmethod
    def get_by_slug(cls, slug):
        return cls.query.filter(cls.slug == slug).first()

    @property
    def default_group(self):
        return self.groups.filter(Group.name == 'default', Group.type == Group.BUILTIN_GROUP).first()

    @property
    def google_apps_domains(self):
        return self.settings.get(self.SETTING_GOOGLE_APPS_DOMAINS, [])

    @property
    def is_public(self):
        return self.settings.get(self.SETTING_IS_PUBLIC, False)

    @property
    def is_disabled(self):
        return self.settings.get('is_disabled', False)

    def disable(self):
        self.settings['is_disabled'] = True

    def enable(self):
        self.settings['is_disabled'] = False

    def set_setting(self, key, value):
        if key not in org_settings:
            raise KeyError(key)

        self.settings.setdefault('settings', {})
        self.settings['settings'][key] = value
        flag_modified(self, 'settings')

    def get_setting(self, key, raise_on_missing=True):
        if key in self.settings.get('settings', {}):
            return self.settings['settings'][key]

        if key in org_settings:
            return org_settings[key]

        if raise_on_missing:
            raise KeyError(key)

        return None

    @property
    def admin_group(self):
        return self.groups.filter(Group.name == 'admin', Group.type == Group.BUILTIN_GROUP).first()

    def has_user(self, email):
        return self.users.filter(User.email == email).count() == 1


@python_2_unicode_compatible
class Group(db.Model, BelongsToOrgMixin):
    DEFAULT_PERMISSIONS = ['create_dashboard', 'create_query', 'edit_dashboard', 'edit_query',
                           'view_query', 'view_source', 'execute_query', 'list_users', 'schedule_query',
                           'list_dashboards', 'list_alerts', 'list_data_sources']

    BUILTIN_GROUP = 'builtin'
    REGULAR_GROUP = 'regular'

    id = Column(db.Integer, primary_key=True)
    data_sources = db.relationship("DataSourceGroup", back_populates="group",
                                         cascade="all")
    org_id = Column(db.Integer, db.ForeignKey('organizations.id'))
    org = db.relationship(Organization, back_populates="groups")
    type = Column(db.String(255), default=REGULAR_GROUP)
    name = Column(db.String(100))
    permissions = Column(postgresql.ARRAY(db.String(255)),
                         default=DEFAULT_PERMISSIONS)
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = 'groups'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'permissions': self.permissions,
            'type': self.type,
            'created_at': self.created_at
        }

    @classmethod
    def all(cls, org):
        return cls.query.filter(cls.org == org)

    @classmethod
    def members(cls, group_id):
        return User.query.filter(User.group_ids.any(group_id))

    @classmethod
    def find_by_name(cls, org, group_names):
        result = cls.query.filter(cls.org == org, cls.name.in_(group_names))
        return list(result)

    def __str__(self):
        return text_type(self.id)


@python_2_unicode_compatible
class User(TimestampMixin, db.Model, BelongsToOrgMixin, UserMixin, PermissionsCheckMixin):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey('organizations.id'))
    org = db.relationship(Organization, backref=db.backref("users", lazy="dynamic"))
    name = Column(db.String(320))
    email = Column(EmailType)
    _profile_image_url = Column('profile_image_url', db.String(320), nullable=True)
    password_hash = Column(db.String(128), nullable=True)
    # XXX replace with association table
    group_ids = Column('groups', MutableList.as_mutable(postgresql.ARRAY(db.Integer)), nullable=True)
    api_key = Column(db.String(40),
                     default=lambda: generate_token(40),
                     unique=True)

    disabled_at = Column(db.DateTime(True), default=None, nullable=True)

    __tablename__ = 'users'
    __table_args__ = (db.Index('users_org_id_email', 'org_id', 'email', unique=True),)

    @property
    def is_disabled(self):
        return self.disabled_at is not None

    def disable(self):
        self.disabled_at = db.func.now()

    def enable(self):
        self.disabled_at = None

    def __init__(self, *args, **kwargs):
        if kwargs.get('email') is not None:
            kwargs['email'] = kwargs['email'].lower()
        super(User, self).__init__(*args, **kwargs)

    def to_dict(self, with_api_key=False):
        profile_image_url = self.profile_image_url
        if self.is_disabled:
            assets = app.extensions['webpack']['assets'] or {}
            path = 'images/avatar.svg'
            profile_image_url = url_for('static', filename=assets.get(path, path))

        d = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'profile_image_url': profile_image_url,
            'groups': self.group_ids,
            'updated_at': self.updated_at,
            'created_at': self.created_at,
            'disabled_at': self.disabled_at,
            'is_disabled': self.is_disabled,
        }

        if self.password_hash is None:
            d['auth_type'] = 'external'
        else:
            d['auth_type'] = 'password'

        if with_api_key:
            d['api_key'] = self.api_key

        d['last_active_at'] = Event.query.filter(Event.user_id == self.id).with_entities(Event.created_at).order_by(Event.created_at.desc()).first()

        return d

    def is_api_user(self):
        return False

    @property
    def profile_image_url(self):
        if self._profile_image_url is not None:
            return self._profile_image_url

        email_md5 = hashlib.md5(self.email.lower()).hexdigest()
        return "https://www.gravatar.com/avatar/{}?s=40&d=identicon".format(email_md5)

    @property
    def permissions(self):
        # TODO: this should be cached.
        return list(itertools.chain(*[g.permissions for g in
                                      Group.query.filter(Group.id.in_(self.group_ids))]))

    @classmethod
    def get_by_email_and_org(cls, email, org):
        return cls.query.filter(cls.email == email, cls.org == org).one()

    @classmethod
    def get_by_api_key_and_org(cls, api_key, org):
        return cls.query.filter(cls.api_key == api_key, cls.org == org).one()

    @classmethod
    def all(cls, org):
        return cls.query.filter(cls.org == org).filter(cls.disabled_at == None)

    @classmethod
    def search(cls, base_query, term):
        term = u'%{}%'.format(term)
        search_filter = or_(cls.name.ilike(term), cls.email.like(term))

        return base_query.filter(search_filter)

    @classmethod
    def all_disabled(cls, org):
        return cls.query.filter(cls.org == org).filter(cls.disabled_at != None)

    @classmethod
    def all_not_disabled(cls, org):
        return cls.all(org).filter(cls.disabled_at == None)

    @classmethod
    def find_by_email(cls, email):
        return cls.query.filter(cls.email == email)

    def __str__(self):
        return u'%s (%s)' % (self.name, self.email)

    def hash_password(self, password):
        self.password_hash = pwd_context.encrypt(password)

    def verify_password(self, password):
        return self.password_hash and pwd_context.verify(password, self.password_hash)

    def update_group_assignments(self, group_names):
        groups = Group.find_by_name(self.org, group_names)
        groups.append(self.org.default_group)
        self.group_ids = [g.id for g in groups]
        db.session.add(self)
        db.session.commit()

    def has_access(self, obj, access_type):
        return AccessPermission.exists(obj, access_type, grantee=self)


class Configuration(TypeDecorator):
    impl = db.Text

    def process_bind_param(self, value, dialect):
        return value.to_json()

    def process_result_value(self, value, dialect):
        return ConfigurationContainer.from_json(value)


@python_2_unicode_compatible
class DataSource(BelongsToOrgMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey('organizations.id'))
    org = db.relationship(Organization, backref="data_sources")

    name = Column(db.String(255))
    type = Column(db.String(255))
    options = Column(ConfigurationContainer.as_mutable(Configuration))
    queue_name = Column(db.String(255), default="queries")
    scheduled_queue_name = Column(db.String(255), default="scheduled_queries")
    created_at = Column(db.DateTime(True), default=db.func.now())

    data_source_groups = db.relationship("DataSourceGroup", back_populates="data_source",
                                         cascade="all")
    __tablename__ = 'data_sources'
    __table_args__ = (db.Index('data_sources_org_id_name', 'org_id', 'name'),)

    def __eq__(self, other):
        return self.id == other.id

    def to_dict(self, all=False, with_permissions_for=None):
        d = {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'syntax': self.query_runner.syntax,
            'paused': self.paused,
            'pause_reason': self.pause_reason
        }

        if all:
            schema = get_configuration_schema_for_query_runner_type(self.type)
            self.options.set_schema(schema)
            d['options'] = self.options.to_dict(mask_secrets=True)
            d['queue_name'] = self.queue_name
            d['scheduled_queue_name'] = self.scheduled_queue_name
            d['groups'] = self.groups

        if with_permissions_for is not None:
            d['view_only'] = db.session.query(DataSourceGroup.view_only).filter(
                DataSourceGroup.group == with_permissions_for,
                DataSourceGroup.data_source == self).one()[0]

        return d

    def __str__(self):
        return text_type(self.name)

    @classmethod
    def create_with_group(cls, *args, **kwargs):
        data_source = cls(*args, **kwargs)
        data_source_group = DataSourceGroup(
            data_source=data_source,
            group=data_source.org.default_group)
        db.session.add_all([data_source, data_source_group])
        return data_source

    @classmethod
    def all(cls, org, group_ids=None):
        data_sources = cls.query.filter(cls.org == org).order_by(cls.id.asc())

        if group_ids:
            data_sources = data_sources.join(DataSourceGroup).filter(
                DataSourceGroup.group_id.in_(group_ids))

        return data_sources.distinct()

    @classmethod
    def get_by_id(cls, _id):
        return cls.query.filter(cls.id == _id).one()

    def delete(self):
        Query.query.filter(Query.data_source == self).update(dict(data_source_id=None, latest_query_data_id=None))
        QueryResult.query.filter(QueryResult.data_source == self).delete()
        res = db.session.delete(self)
        db.session.commit()
        return res

    def get_schema(self, refresh=False):
        key = "data_source:schema:{}".format(self.id)

        cache = None
        if not refresh:
            cache = redis_connection.get(key)

        if cache is None:
            query_runner = self.query_runner
            schema = sorted(query_runner.get_schema(get_stats=refresh), key=lambda t: t['name'])

            redis_connection.set(key, json_dumps(schema))
        else:
            schema = json_loads(cache)

        return schema

    def _pause_key(self):
        return 'ds:{}:pause'.format(self.id)

    @property
    def paused(self):
        return redis_connection.exists(self._pause_key())

    @property
    def pause_reason(self):
        return redis_connection.get(self._pause_key())

    def pause(self, reason=None):
        redis_connection.set(self._pause_key(), reason)

    def resume(self):
        redis_connection.delete(self._pause_key())

    def add_group(self, group, view_only=False):
        dsg = DataSourceGroup(group=group, data_source=self, view_only=view_only)
        db.session.add(dsg)
        return dsg

    def remove_group(self, group):
        db.session.query(DataSourceGroup).filter(
            DataSourceGroup.group == group,
            DataSourceGroup.data_source == self).delete()
        db.session.commit()

    def update_group_permission(self, group, view_only):
        dsg = DataSourceGroup.query.filter(
            DataSourceGroup.group == group,
            DataSourceGroup.data_source == self).one()
        dsg.view_only = view_only
        db.session.add(dsg)
        return dsg

    @property
    def query_runner(self):
        return get_query_runner(self.type, self.options)

    @classmethod
    def get_by_name(cls, name):
        return cls.query.filter(cls.name == name).one()

    # XXX examine call sites to see if a regular SQLA collection would work better
    @property
    def groups(self):
        groups = db.session.query(DataSourceGroup).filter(
            DataSourceGroup.data_source == self)
        return dict(map(lambda g: (g.group_id, g.view_only), groups))


class DataSourceGroup(db.Model):
    # XXX drop id, use datasource/group as PK
    id = Column(db.Integer, primary_key=True)
    data_source_id = Column(db.Integer, db.ForeignKey("data_sources.id"))
    data_source = db.relationship(DataSource, back_populates="data_source_groups")
    group_id = Column(db.Integer, db.ForeignKey("groups.id"))
    group = db.relationship(Group, back_populates="data_sources")
    view_only = Column(db.Boolean, default=False)

    __tablename__ = "data_source_groups"


@python_2_unicode_compatible
class QueryResult(db.Model, BelongsToOrgMixin):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey('organizations.id'))
    org = db.relationship(Organization)
    data_source_id = Column(db.Integer, db.ForeignKey("data_sources.id"))
    data_source = db.relationship(DataSource, backref=backref('query_results'))
    query_hash = Column(db.String(32), index=True)
    query_text = Column('query', db.Text)
    data = Column(db.Text)
    runtime = Column(postgresql.DOUBLE_PRECISION)
    retrieved_at = Column(db.DateTime(True))

    __tablename__ = 'query_results'

    def to_dict(self):
        return {
            'id': self.id,
            'query_hash': self.query_hash,
            'query': self.query_text,
            'data': json_loads(self.data),
            'data_source_id': self.data_source_id,
            'runtime': self.runtime,
            'retrieved_at': self.retrieved_at
        }

    @classmethod
    def unused(cls, days=7):
        age_threshold = datetime.datetime.now() - datetime.timedelta(days=days)

        unused_results = (db.session.query(QueryResult.id).filter(
            Query.id == None, QueryResult.retrieved_at < age_threshold)
            .outerjoin(Query))

        return unused_results

    @classmethod
    def get_latest(cls, data_source, query, max_age=0):
        query_hash = utils.gen_query_hash(query)

        if max_age == -1:
            q = db.session.query(QueryResult).filter(
                cls.query_hash == query_hash,
                cls.data_source == data_source).order_by(
                    QueryResult.retrieved_at.desc())
        else:
            q = db.session.query(QueryResult).filter(
                QueryResult.query_hash == query_hash,
                QueryResult.data_source == data_source,
                db.func.timezone('utc', QueryResult.retrieved_at) +
                datetime.timedelta(seconds=max_age) >=
                db.func.timezone('utc', db.func.now())
            ).order_by(QueryResult.retrieved_at.desc())

        return q.first()

    @classmethod
    def store_result(cls, org, data_source, query_hash, query, data, run_time, retrieved_at):
        query_result = cls(org_id=org,
                           query_hash=query_hash,
                           query_text=query,
                           runtime=run_time,
                           data_source=data_source,
                           retrieved_at=retrieved_at,
                           data=data)
        db.session.add(query_result)
        logging.info("Inserted query (%s) data; id=%s", query_hash, query_result.id)
        # TODO: Investigate how big an impact this select-before-update makes.
        queries = db.session.query(Query).filter(
            Query.query_hash == query_hash,
            Query.data_source == data_source)
        for q in queries:
            q.latest_query_data = query_result
            db.session.add(q)
        query_ids = [q.id for q in queries]
        logging.info("Updated %s queries with result (%s).", len(query_ids), query_hash)

        return query_result, query_ids

    def __str__(self):
        return u"%d | %s | %s" % (self.id, self.query_hash, self.retrieved_at)

    @property
    def groups(self):
        return self.data_source.groups

    def make_csv_content(self):
        s = cStringIO.StringIO()

        query_data = json_loads(self.data)
        writer = csv.DictWriter(s, extrasaction="ignore", fieldnames=[col['name'] for col in query_data['columns']])
        writer.writer = utils.UnicodeWriter(s)
        writer.writeheader()
        for row in query_data['rows']:
            writer.writerow(row)

        return s.getvalue()

    def make_excel_content(self):
        s = cStringIO.StringIO()

        query_data = json_loads(self.data)
        book = xlsxwriter.Workbook(s, {'constant_memory': True})
        sheet = book.add_worksheet("result")

        column_names = []
        for (c, col) in enumerate(query_data['columns']):
            sheet.write(0, c, col['name'])
            column_names.append(col['name'])

        for (r, row) in enumerate(query_data['rows']):
            for (c, name) in enumerate(column_names):
                v = row.get(name)
                if isinstance(v, list):
                    v = str(v).encode('utf-8')
                sheet.write(r + 1, c, v)

        book.close()

        return s.getvalue()


def should_schedule_next(previous_iteration, now, schedule, failures):
    if schedule.isdigit():
        ttl = int(schedule)
        next_iteration = previous_iteration + datetime.timedelta(seconds=ttl)
    else:
        hour, minute = schedule.split(':')
        hour, minute = int(hour), int(minute)

        # The following logic is needed for cases like the following:
        # - The query scheduled to run at 23:59.
        # - The scheduler wakes up at 00:01.
        # - Using naive implementation of comparing timestamps, it will skip the execution.
        normalized_previous_iteration = previous_iteration.replace(hour=hour, minute=minute)
        if normalized_previous_iteration > previous_iteration:
            previous_iteration = normalized_previous_iteration - datetime.timedelta(days=1)

        next_iteration = (previous_iteration + datetime.timedelta(days=1)).replace(hour=hour, minute=minute)
    if failures:
        next_iteration += datetime.timedelta(minutes=2**failures)
    return now > next_iteration


@python_2_unicode_compatible
class Query(ChangeTrackingMixin, TimestampMixin, BelongsToOrgMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    version = Column(db.Integer, default=1)
    org_id = Column(db.Integer, db.ForeignKey('organizations.id'))
    org = db.relationship(Organization, backref="queries")
    data_source_id = Column(db.Integer, db.ForeignKey("data_sources.id"), nullable=True)
    data_source = db.relationship(DataSource, backref='queries')
    latest_query_data_id = Column(db.Integer, db.ForeignKey("query_results.id"), nullable=True)
    latest_query_data = db.relationship(QueryResult)
    name = Column(db.String(255))
    description = Column(db.String(4096), nullable=True)
    query_text = Column("query", db.Text)
    query_hash = Column(db.String(32))
    api_key = Column(db.String(40), default=lambda: generate_token(40))
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, foreign_keys=[user_id])
    last_modified_by_id = Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    last_modified_by = db.relationship(User, backref="modified_queries",
                                       foreign_keys=[last_modified_by_id])
    is_archived = Column(db.Boolean, default=False, index=True)
    is_draft = Column(db.Boolean, default=True, index=True)
    schedule = Column(db.String(10), nullable=True)
    schedule_failures = Column(db.Integer, default=0)
    visualizations = db.relationship("Visualization", cascade="all, delete-orphan")
    options = Column(MutableDict.as_mutable(PseudoJSON), default={})
    search_vector = Column(TSVectorType('id', 'name', 'description', 'query',
                                        weights={'name': 'A',
                                                 'id': 'B',
                                                 'description': 'C',
                                                 'query': 'D'}),
                           nullable=True)
    tags = Column('tags', MutableList.as_mutable(postgresql.ARRAY(db.Unicode)), nullable=True)

    query_class = SearchBaseQuery
    __tablename__ = 'queries'
    __mapper_args__ = {
        "version_id_col": version,
        'version_id_generator': False
    }

    def archive(self, user=None):
        db.session.add(self)
        self.is_archived = True
        self.schedule = None

        for vis in self.visualizations:
            for w in vis.widgets:
                db.session.delete(w)

        for a in self.alerts:
            db.session.delete(a)

        if user:
            self.record_changes(user)

    @classmethod
    def create(cls, **kwargs):
        query = cls(**kwargs)
        db.session.add(Visualization(query_rel=query,
                                     name="Table",
                                     description='',
                                     type="TABLE",
                                     options="{}"))
        return query

    @classmethod
    def all_queries(cls, group_ids, user_id=None, drafts=False):
        query_ids = (
            db.session
            .query(distinct(cls.id))
            .join(
                DataSourceGroup,
                Query.data_source_id == DataSourceGroup.data_source_id
            )
            .filter(Query.is_archived == False)
            .filter(DataSourceGroup.group_id.in_(group_ids))
        )
        q = (
            cls
            .query
            .options(
                joinedload(Query.user),
                joinedload(
                    Query.latest_query_data
                ).load_only(
                    'runtime',
                    'retrieved_at',
                )
            )
            .filter(cls.id.in_(query_ids))
            # Adding outer joins to be able to order by relationship
            .outerjoin(User, User.id == Query.user_id)
            .outerjoin(
                QueryResult,
                QueryResult.id == Query.latest_query_data_id
            )
            .options(
                contains_eager(Query.user),
                contains_eager(Query.latest_query_data),
            )
            .order_by(Query.created_at.desc())
        )

        if not drafts:
            q = q.filter(
                or_(
                    Query.is_draft == False,
                    Query.user_id == user_id
                )
            )
        return q

    @classmethod
    def favorites(cls, user, base_query=None):
        if base_query == None:
            base_query = cls.all_queries(user.group_ids, user.id, drafts=True)
        return base_query.join((Favorite, and_(Favorite.object_type==u'Query', Favorite.object_id==Query.id))).filter(Favorite.user_id==user.id)

    @classmethod
    def all_tags(cls, user, include_drafts=False):
        where = cls.is_archived == False

        if not include_drafts:
            where &= cls.is_draft == False

        where &= DataSourceGroup.group_id.in_(user.group_ids)

        tag_column = func.unnest(cls.tags).label('tag')
        usage_count = func.count(1).label('usage_count')

        return db.session.query(tag_column, usage_count).join(
            DataSourceGroup,
            cls.data_source_id == DataSourceGroup.data_source_id
        ).filter(where).distinct().group_by(tag_column).order_by(usage_count.desc())  # .limit(limit)

    @classmethod
    def by_user(cls, user):
        return cls.all_queries(user.group_ids, user.id).filter(Query.user == user)

    @classmethod
    def outdated_queries(cls):
        queries = (db.session.query(Query)
                   .options(joinedload(Query.latest_query_data).load_only('retrieved_at'))
                   .filter(Query.schedule != None)
                   .order_by(Query.id))

        now = utils.utcnow()
        outdated_queries = {}
        scheduled_queries_executions.refresh()

        for query in queries:
            if query.latest_query_data:
                retrieved_at = query.latest_query_data.retrieved_at
            else:
                retrieved_at = now

            retrieved_at = scheduled_queries_executions.get(query.id) or retrieved_at

            if should_schedule_next(retrieved_at, now, query.schedule, query.schedule_failures):
                key = "{}:{}".format(query.query_hash, query.data_source_id)
                outdated_queries[key] = query

        return outdated_queries.values()

    @classmethod
    def search(cls, term, group_ids, user_id=None, include_drafts=False, limit=None):
        all_queries = cls.all_queries(group_ids, user_id=user_id, drafts=include_drafts)
        # sort the result using the weight as defined in the search vector column
        return all_queries.search(term, sort=True).limit(limit)

    @classmethod
    def search_by_user(cls, term, user, limit=None):
        return cls.by_user(user).search(term, sort=True).limit(limit)

    @classmethod
    def recent(cls, group_ids, user_id=None, limit=20):
        query = (cls.query
                 .filter(Event.created_at > (db.func.current_date() - 7))
                 .join(Event, Query.id == Event.object_id.cast(db.Integer))
                 .join(DataSourceGroup, Query.data_source_id == DataSourceGroup.data_source_id)
                 .filter(
                     Event.action.in_(['edit', 'execute', 'edit_name',
                                       'edit_description', 'view_source']),
                     Event.object_id != None,
                     Event.object_type == 'query',
                     DataSourceGroup.group_id.in_(group_ids),
                     or_(Query.is_draft == False, Query.user_id == user_id),
                     Query.is_archived == False)
                 .group_by(Event.object_id, Query.id)
                 .order_by(db.desc(db.func.count(0))))

        if user_id:
            query = query.filter(Event.user_id == user_id)

        query = query.limit(limit)

        return query

    @classmethod
    def get_by_id(cls, _id):
        return cls.query.filter(cls.id == _id).one()

    def fork(self, user):
        forked_list = ['org', 'data_source', 'latest_query_data', 'description',
                       'query_text', 'query_hash', 'options']
        kwargs = {a: getattr(self, a) for a in forked_list}
        forked_query = Query.create(name=u'Copy of (#{}) {}'.format(self.id, self.name),
                                    user=user, **kwargs)

        for v in self.visualizations:
            if v.type == 'TABLE':
                continue
            forked_v = v.copy()
            forked_v['query_rel'] = forked_query
            forked_query.visualizations.append(Visualization(**forked_v))
        db.session.add(forked_query)
        return forked_query

    @property
    def runtime(self):
        return self.latest_query_data.runtime

    @property
    def retrieved_at(self):
        return self.latest_query_data.retrieved_at

    @property
    def groups(self):
        if self.data_source is None:
            return {}

        return self.data_source.groups

    @hybrid_property
    def lowercase_name(self):
        "Optional property useful for sorting purposes."
        return self.name.lower()

    @lowercase_name.expression
    def lowercase_name(cls):
        "The SQLAlchemy expression for the property above."
        return func.lower(cls.name)

    def __str__(self):
        return text_type(self.id)

    def __repr__(self):
        return '<Query %s: "%s">' % (self.id, self.name or 'untitled')


@vectorizer(db.Integer)
def integer_vectorizer(column):
    return db.func.cast(column, db.Text)


@listens_for(Query.query_text, 'set')
def gen_query_hash(target, val, oldval, initiator):
    target.query_hash = utils.gen_query_hash(val)
    target.schedule_failures = 0


@listens_for(Query.user_id, 'set')
def query_last_modified_by(target, val, oldval, initiator):
    target.last_modified_by_id = val


class Favorite(TimestampMixin, db.Model):
    __tablename__ = "favorites"

    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))

    object_type = Column(db.Unicode(255))
    object_id = Column(db.Integer)
    object = generic_relationship(object_type, object_id)

    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, backref='favorites')

    __table_args__ = (UniqueConstraint("object_type", "object_id", "user_id", name="unique_favorite"),)

    @classmethod
    def is_favorite(cls, user, object):
        return cls.query.filter(cls.object == object, cls.user_id == user).count() > 0

    @classmethod
    def are_favorites(cls, user, objects):
        objects = list(objects)
        if not objects:
            return []

        object_type = text_type(objects[0].__class__.__name__)
        return map(lambda fav: fav.object_id, cls.query.filter(cls.object_id.in_(map(lambda o: o.id, objects)), cls.object_type == object_type, cls.user_id == user))


class AccessPermission(GFKBase, db.Model):
    id = Column(db.Integer, primary_key=True)
    # 'object' defined in GFKBase
    access_type = Column(db.String(255))
    grantor_id = Column(db.Integer, db.ForeignKey("users.id"))
    grantor = db.relationship(User, backref='grantor', foreign_keys=[grantor_id])
    grantee_id = Column(db.Integer, db.ForeignKey("users.id"))
    grantee = db.relationship(User, backref='grantee', foreign_keys=[grantee_id])

    __tablename__ = 'access_permissions'

    @classmethod
    def grant(cls, obj, access_type, grantee, grantor):
        grant = cls.query.filter(cls.object_type == obj.__tablename__,
                                 cls.object_id == obj.id,
                                 cls.access_type == access_type,
                                 cls.grantee == grantee,
                                 cls.grantor == grantor).one_or_none()

        if not grant:
            grant = cls(object_type=obj.__tablename__,
                        object_id=obj.id,
                        access_type=access_type,
                        grantee=grantee,
                        grantor=grantor)
            db.session.add(grant)

        return grant

    @classmethod
    def revoke(cls, obj, grantee, access_type=None):
        permissions = cls._query(obj, access_type, grantee)
        return permissions.delete()

    @classmethod
    def find(cls, obj, access_type=None, grantee=None, grantor=None):
        return cls._query(obj, access_type, grantee, grantor)

    @classmethod
    def exists(cls, obj, access_type, grantee):
        return cls.find(obj, access_type, grantee).count() > 0

    @classmethod
    def _query(cls, obj, access_type=None, grantee=None, grantor=None):
        q = cls.query.filter(cls.object_id == obj.id,
                             cls.object_type == obj.__tablename__)

        if access_type:
            q = q.filter(AccessPermission.access_type == access_type)

        if grantee:
            q = q.filter(AccessPermission.grantee == grantee)

        if grantor:
            q = q.filter(AccessPermission.grantor == grantor)

        return q

    def to_dict(self):
        d = {
            'id': self.id,
            'object_id': self.object_id,
            'object_type': self.object_type,
            'access_type': self.access_type,
            'grantor': self.grantor_id,
            'grantee': self.grantee_id
        }
        return d


class Change(GFKBase, db.Model):
    id = Column(db.Integer, primary_key=True)
    # 'object' defined in GFKBase
    object_version = Column(db.Integer, default=0)
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, backref='changes')
    change = Column(PseudoJSON)
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = 'changes'

    def to_dict(self, full=True):
        d = {
            'id': self.id,
            'object_id': self.object_id,
            'object_type': self.object_type,
            'change_type': self.change_type,
            'object_version': self.object_version,
            'change': self.change,
            'created_at': self.created_at
        }

        if full:
            d['user'] = self.user.to_dict()
        else:
            d['user_id'] = self.user_id

        return d

    @classmethod
    def last_change(cls, obj):
        return db.session.query(cls).filter(
            cls.object_id == obj.id,
            cls.object_type == obj.__class__.__tablename__).order_by(
                cls.object_version.desc()).first()


class Alert(TimestampMixin, db.Model):
    UNKNOWN_STATE = 'unknown'
    OK_STATE = 'ok'
    TRIGGERED_STATE = 'triggered'

    id = Column(db.Integer, primary_key=True)
    name = Column(db.String(255))
    query_id = Column(db.Integer, db.ForeignKey("queries.id"))
    query_rel = db.relationship(Query, backref=backref('alerts', cascade="all"))
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, backref='alerts')
    options = Column(MutableDict.as_mutable(PseudoJSON))
    state = Column(db.String(255), default=UNKNOWN_STATE)
    subscriptions = db.relationship("AlertSubscription", cascade="all, delete-orphan")
    last_triggered_at = Column(db.DateTime(True), nullable=True)
    rearm = Column(db.Integer, nullable=True)

    __tablename__ = 'alerts'

    @classmethod
    def all(cls, group_ids):
        return db.session.query(Alert)\
            .options(joinedload(Alert.user), joinedload(Alert.query_rel))\
            .join(Query)\
            .join(DataSourceGroup, DataSourceGroup.data_source_id == Query.data_source_id)\
            .filter(DataSourceGroup.group_id.in_(group_ids))

    @classmethod
    def get_by_id_and_org(cls, id, org):
        return db.session.query(Alert).join(Query).filter(Alert.id == id, Query.org == org).one()

    def evaluate(self):
        data = json_loads(self.query_rel.latest_query_data.data)
        if data['rows']:
            value = data['rows'][0][self.options['column']]
            op = self.options['op']

            if op == 'greater than' and value > self.options['value']:
                new_state = self.TRIGGERED_STATE
            elif op == 'less than' and value < self.options['value']:
                new_state = self.TRIGGERED_STATE
            elif op == 'equals' and value == self.options['value']:
                new_state = self.TRIGGERED_STATE
            else:
                new_state = self.OK_STATE
        else:
            new_state = self.UNKNOWN_STATE

        return new_state

    def subscribers(self):
        return User.query.join(AlertSubscription).filter(AlertSubscription.alert == self)

    @property
    def groups(self):
        return self.query_rel.groups


def generate_slug(ctx):
    slug = utils.slugify(ctx.current_parameters['name'])
    tries = 1
    while Dashboard.query.filter(Dashboard.slug == slug).first() is not None:
        slug = utils.slugify(ctx.current_parameters['name']) + "_" + str(tries)
        tries += 1
    return slug


@python_2_unicode_compatible
class Dashboard(ChangeTrackingMixin, TimestampMixin, BelongsToOrgMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    version = Column(db.Integer)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship(Organization, backref="dashboards")
    slug = Column(db.String(140), index=True, default=generate_slug)
    name = Column(db.String(100))
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User)
    # layout is no longer used, but kept so we know how to render old dashboards.
    layout = Column(db.Text)
    dashboard_filters_enabled = Column(db.Boolean, default=False)
    is_archived = Column(db.Boolean, default=False, index=True)
    is_draft = Column(db.Boolean, default=True, index=True)
    widgets = db.relationship('Widget', backref='dashboard', lazy='dynamic')
    tags = Column('tags', MutableList.as_mutable(postgresql.ARRAY(db.Unicode)), nullable=True)

    __tablename__ = 'dashboards'
    __mapper_args__ = {
        "version_id_col": version
        }

    @classmethod
    def all(cls, org, group_ids, user_id):
        query = (
            Dashboard.query
            .options(joinedload(Dashboard.user))
            .outerjoin(Widget)
            .outerjoin(Visualization)
            .outerjoin(Query)
            .outerjoin(DataSourceGroup, Query.data_source_id == DataSourceGroup.data_source_id)
            .filter(
                Dashboard.is_archived == False,
                (DataSourceGroup.group_id.in_(group_ids) |
                 (Dashboard.user_id == user_id) |
                 ((Widget.dashboard != None) & (Widget.visualization == None))),
                Dashboard.org == org)
            .distinct())

        query = query.filter(or_(Dashboard.user_id == user_id, Dashboard.is_draft == False))

        return query

    @classmethod
    def search(cls, org, groups_ids, user_id, search_term):
        # TODO: switch to FTS
        return cls.all(org, groups_ids, user_id).filter(cls.name.ilike(u'%{}%'.format(search_term)))

    @classmethod
    def all_tags(cls, org, user):
        tag_column = func.unnest(cls.tags).label('tag')
        usage_count = func.count(1).label('usage_count')

        query = (
            db.session.query(tag_column, usage_count)
            .outerjoin(Widget)
            .outerjoin(Visualization)
            .outerjoin(Query)
            .outerjoin(DataSourceGroup, Query.data_source_id == DataSourceGroup.data_source_id)
            .filter(
                Dashboard.is_archived == False,
                (DataSourceGroup.group_id.in_(user.group_ids) |
                 (Dashboard.user_id == user.id) |
                 ((Widget.dashboard != None) & (Widget.visualization == None))),
                Dashboard.org == org)
            .group_by(tag_column))

        query = query.filter(or_(Dashboard.user_id == user.id, Dashboard.is_draft == False))

        return query.order_by(usage_count.desc())

    @classmethod
    def favorites(cls, user, base_query=None):
        if base_query is None:
            base_query = cls.all(user.org, user.group_ids, user.id)
        return base_query.join((Favorite, and_(Favorite.object_type==u'Dashboard', Favorite.object_id==Dashboard.id))).filter(Favorite.user_id==user.id)

    @classmethod
    def get_by_slug_and_org(cls, slug, org):
        return cls.query.filter(cls.slug == slug, cls.org == org).one()

    @hybrid_property
    def lowercase_name(self):
        "Optional property useful for sorting purposes."
        return self.name.lower()

    @lowercase_name.expression
    def lowercase_name(cls):
        "The SQLAlchemy expression for the property above."
        return func.lower(cls.name)

    def __str__(self):
        return u"%s=%s" % (self.id, self.name)


@python_2_unicode_compatible
class Visualization(TimestampMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    type = Column(db.String(100))
    query_id = Column(db.Integer, db.ForeignKey("queries.id"))
    # query_rel and not query, because db.Model already has query defined.
    query_rel = db.relationship(Query, back_populates='visualizations')
    name = Column(db.String(255))
    description = Column(db.String(4096), nullable=True)
    options = Column(db.Text)

    __tablename__ = 'visualizations'

    @classmethod
    def get_by_id_and_org(cls, visualization_id, org):
        return db.session.query(Visualization).join(Query).filter(
            cls.id == visualization_id,
            Query.org == org).one()

    def __str__(self):
        return u"%s %s" % (self.id, self.type)

    def copy(self):
        return {
            'type': self.type,
            'name': self.name,
            'description': self.description,
            'options': self.options
        }


@python_2_unicode_compatible
class Widget(TimestampMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    visualization_id = Column(db.Integer, db.ForeignKey('visualizations.id'), nullable=True)
    visualization = db.relationship(Visualization, backref='widgets')
    text = Column(db.Text, nullable=True)
    width = Column(db.Integer)
    options = Column(db.Text)
    dashboard_id = Column(db.Integer, db.ForeignKey("dashboards.id"), index=True)

    __tablename__ = 'widgets'

    def __str__(self):
        return u"%s" % self.id

    @classmethod
    def get_by_id_and_org(cls, widget_id, org):
        return db.session.query(cls).join(Dashboard).filter(cls.id == widget_id, Dashboard.org == org).one()


@python_2_unicode_compatible
class Event(db.Model):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship(Organization, back_populates="events")
    user_id = Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    user = db.relationship(User, backref="events")
    action = Column(db.String(255))
    object_type = Column(db.String(255))
    object_id = Column(db.String(255), nullable=True)
    additional_properties = Column(MutableDict.as_mutable(PseudoJSON), nullable=True, default={})
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = 'events'

    def __str__(self):
        return u"%s,%s,%s,%s" % (self.user_id, self.action, self.object_type, self.object_id)

    def to_dict(self):
        return {
            'org_id': self.org_id,
            'user_id': self.user_id,
            'action': self.action,
            'object_type': self.object_type,
            'object_id': self.object_id,
            'additional_properties': self.additional_properties,
            'created_at': self.created_at.isoformat()
        }

    @classmethod
    def record(cls, event):
        org_id = event.pop('org_id')
        user_id = event.pop('user_id', None)
        action = event.pop('action')
        object_type = event.pop('object_type')
        object_id = event.pop('object_id', None)

        created_at = datetime.datetime.utcfromtimestamp(event.pop('timestamp'))

        event = cls(org_id=org_id, user_id=user_id, action=action,
                    object_type=object_type, object_id=object_id,
                    additional_properties=event,
                    created_at=created_at)
        db.session.add(event)
        return event


class ApiKey(TimestampMixin, GFKBase, db.Model):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship(Organization)
    api_key = Column(db.String(255), index=True, default=lambda: generate_token(40))
    active = Column(db.Boolean, default=True)
    # 'object' provided by GFKBase
    created_by_id = Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by = db.relationship(User)

    __tablename__ = 'api_keys'
    __table_args__ = (db.Index('api_keys_object_type_object_id', 'object_type', 'object_id'),)

    @classmethod
    def get_by_api_key(cls, api_key):
        return cls.query.filter(cls.api_key == api_key, cls.active == True).one()

    @classmethod
    def get_by_object(cls, object):
        return cls.query.filter(cls.object_type == object.__class__.__tablename__, cls.object_id == object.id, cls.active == True).first()

    @classmethod
    def create_for_object(cls, object, user):
        k = cls(org=user.org, object=object, created_by=user)
        db.session.add(k)
        return k


@python_2_unicode_compatible
class NotificationDestination(BelongsToOrgMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship(Organization, backref="notification_destinations")
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, backref="notification_destinations")
    name = Column(db.String(255))
    type = Column(db.String(255))
    options = Column(ConfigurationContainer.as_mutable(Configuration))
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = 'notification_destinations'
    __table_args__ = (db.Index('notification_destinations_org_id_name', 'org_id',
                               'name', unique=True),)

    def to_dict(self, all=False):
        d = {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'icon': self.destination.icon()
        }

        if all:
            schema = get_configuration_schema_for_destination_type(self.type)
            self.options.set_schema(schema)
            d['options'] = self.options.to_dict(mask_secrets=True)

        return d

    def __str__(self):
        return text_type(self.name)

    @property
    def destination(self):
        return get_destination(self.type, self.options)

    @classmethod
    def all(cls, org):
        notification_destinations = cls.query.filter(cls.org == org).order_by(cls.id.asc())

        return notification_destinations

    def notify(self, alert, query, user, new_state, app, host):
        schema = get_configuration_schema_for_destination_type(self.type)
        self.options.set_schema(schema)
        return self.destination.notify(alert, query, user, new_state,
                                       app, host, self.options)


class AlertSubscription(TimestampMixin, db.Model):
    id = Column(db.Integer, primary_key=True)
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User)
    destination_id = Column(db.Integer,
                               db.ForeignKey("notification_destinations.id"),
                               nullable=True)
    destination = db.relationship(NotificationDestination)
    alert_id = Column(db.Integer, db.ForeignKey("alerts.id"))
    alert = db.relationship(Alert, back_populates="subscriptions")

    __tablename__ = 'alert_subscriptions'
    __table_args__ = (db.Index('alert_subscriptions_destination_id_alert_id',
                               'destination_id', 'alert_id', unique=True),)

    def to_dict(self):
        d = {
            'id': self.id,
            'user': self.user.to_dict(),
            'alert_id': self.alert_id
        }

        if self.destination:
            d['destination'] = self.destination.to_dict()

        return d

    @classmethod
    def all(cls, alert_id):
        return AlertSubscription.query.join(User).filter(AlertSubscription.alert_id == alert_id)

    def notify(self, alert, query, user, new_state, app, host):
        if self.destination:
            return self.destination.notify(alert, query, user, new_state,
                                           app, host)
        else:
            # User email subscription, so create an email destination object
            config = {'addresses': self.user.email}
            schema = get_configuration_schema_for_destination_type('email')
            options = ConfigurationContainer(config, schema)
            destination = get_destination('email', options)
            return destination.notify(alert, query, user, new_state, app, host, options)


class QuerySnippet(TimestampMixin, db.Model, BelongsToOrgMixin):
    id = Column(db.Integer, primary_key=True)
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship(Organization, backref="query_snippets")
    trigger = Column(db.String(255), unique=True)
    description = Column(db.Text)
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship(User, backref="query_snippets")
    snippet = Column(db.Text)
    __tablename__ = 'query_snippets'

    @classmethod
    def all(cls, org):
        return cls.query.filter(cls.org == org)

    def to_dict(self):
        d = {
            'id': self.id,
            'trigger': self.trigger,
            'description': self.description,
            'snippet': self.snippet,
            'user': self.user.to_dict(),
            'updated_at': self.updated_at,
            'created_at': self.created_at
        }

        return d


_gfk_types = {'queries': Query, 'dashboards': Dashboard}


def init_db():
    default_org = Organization(name="Default", slug='default', settings={})
    admin_group = Group(name='admin', permissions=['admin', 'super_admin'], org=default_org, type=Group.BUILTIN_GROUP)
    default_group = Group(name='default', permissions=Group.DEFAULT_PERMISSIONS, org=default_org, type=Group.BUILTIN_GROUP)

    db.session.add_all([default_org, admin_group, default_group])
    # XXX remove after fixing User.group_ids
    db.session.commit()
    return default_org, admin_group, default_group
