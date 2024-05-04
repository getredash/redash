from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.sql import select
from sqlalchemy_utils.models import generic_repr

from redash.models.base import Column, db, primary_key
from redash.models.mixins import TimestampMixin
from redash.models.types import MutableDict
from redash.models.users import Group
from redash.settings.organization import settings as org_settings


@generic_repr("id", "name", "slug")
class Organization(TimestampMixin, db.Model):
    SETTING_GOOGLE_APPS_DOMAINS = "google_apps_domains"
    SETTING_IS_PUBLIC = "is_public"

    id = primary_key("Organization")
    name = Column(db.String(255))
    slug = Column(db.String(255), unique=True)
    settings = Column(MutableDict.as_mutable(JSONB), default={})
    queries = db.relationship("Query", back_populates="org")
    groups = db.relationship("Group", back_populates="org")
    events = db.relationship("Event", lazy="noload", order_by="desc(Event.created_at)")
    notification_destinations = db.relationship("NotificationDestination", back_populates="org", lazy="noload")
    query_snippets = db.relationship("QuerySnippet", back_populates="org", lazy="noload")
    query_results = db.relationship("QueryResult", back_populates="org", lazy="noload")
    data_sources = db.relationship("DataSource", back_populates="org", lazy="noload")
    users = db.relationship("User", back_populates="org")
    dashboards = db.relationship("Dashboard", back_populates="org")

    __tablename__ = "organizations"

    def __str__(self):
        return "%s (%s)" % (self.name, self.id)

    @classmethod
    def get_by_slug(cls, slug):
        return db.session.scalar(select(cls).where(cls.slug == slug))

    @classmethod
    def get_by_id(cls, _id):
        return db.session.scalars(select(cls).where(cls.id == _id)).one()

    @property
    def default_group(self):
        for g in self.groups:
            if g.name == "default" and g.type == Group.BUILTIN_GROUP:
                return g
        return None

    @property
    def google_apps_domains(self):
        return self.settings.get(self.SETTING_GOOGLE_APPS_DOMAINS, [])

    @property
    def is_public(self):
        return self.settings.get(self.SETTING_IS_PUBLIC, False)

    @property
    def is_disabled(self):
        return self.settings.get("is_disabled", False)

    def disable(self):
        self.settings["is_disabled"] = True

    def enable(self):
        self.settings["is_disabled"] = False

    def set_setting(self, key, value):
        if key not in org_settings:
            raise KeyError(key)

        self.settings.setdefault("settings", {})
        self.settings["settings"][key] = value
        flag_modified(self, "settings")

    def get_setting(self, key, raise_on_missing=True):
        if key in self.settings.get("settings", {}):
            return self.settings["settings"][key]

        if key in org_settings:
            return org_settings[key]

        if raise_on_missing:
            raise KeyError(key)

        return None

    @property
    def admin_group(self):
        for g in self.groups:
            if g.name == "admin" and g.type == Group.BUILTIN_GROUP:
                return g
        return None

    def has_user(self, email):
        for u in self.users:
            if u.email == email:
                return True
        return False
