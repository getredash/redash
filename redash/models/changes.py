from sqlalchemy.inspection import inspect
from sqlalchemy_utils.models import generic_repr
from sqlalchemy.orm import object_session
from sqlalchemy.ext.mutable import MutableBase

from inspect import isclass
from enum import Enum

from redash.utils.configuration import ConfigurationContainer

from .base import GFKBase, db, Column
from .types import PseudoJSON

# Structure of Change object
# user_id
#   reference to a user that modified object
# created_at
#   time when modification was made
# object_type/object_id
#   reference to modified object (e.g. query, dashboard)
# changes.object_type/changes.object_id
#   reference to a real target. When there are relation between entities, object_type/object_id contains
#   a reference to "parent", and changes.object_type/changes.object_id contains a reference to "child".
#   For example, when modifying a visualization, changes.object_type/changes.object_id will be the reference
#   to that visualization, and object_type/object_id will be the reference to a query for this visualization.
# changes.changes
#   a dictionary where keys are names of modified fields and values are tuples with field values.
#   Tuple may contain one value if field wasn't changes OR if value was mutated (MutableDict/List/Set),
#   or two values - previous and new one. In both cases tuple is used to avoid situations when field
#   contains an JSON array and may be wrongly interpreted.


@generic_repr("id", "object_type", "object_id", "created_at")
class Change(GFKBase, db.Model):
    class Type(str, Enum):  # `str` to make it json-serializable
        Created = "created"
        Modified = "modified"
        Deleted = "deleted"

    id = Column(db.Integer, primary_key=True)
    # 'object' defined in GFKBase
    org_id = Column(db.Integer, db.ForeignKey("organizations.id"))
    org = db.relationship("Organization", backref="changes")
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship("User", backref="changes")
    change = Column(PseudoJSON)
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = "changes"

    def to_dict(self, extended=True):
        result = {
            "id": self.id,
            "created_at": self.created_at,
            # TODO: return an object (and target?) as a sub-structure, but carefully - they may be removed
            "object_type": self.object_type,
            "object_id": self.object_id,
            "target_type": self.change["object_type"],
            "target_id": self.change["object_id"],
            "change_type": self.change["change_type"],
            "changes": self.change["changes"],
        }

        # TODO: user may be deleted - need to handle this
        if extended:
            result["user"] = self.user.to_dict()
        else:
            result["user_id"] = self.user_id

        return result

    @classmethod
    def all_changes(cls, org):
        return cls.query.filter(cls.org == org).order_by(cls.id.desc())

    @classmethod
    def get_by_object(cls, target_object, org):
        return cls.query.filter(
            cls.org == org,
            cls.object_type == target_object.__table__.name,
            cls.object_id == target_object.id,
        ).order_by(cls.id.desc())


def _to_json(value):
    if isinstance(value, ConfigurationContainer):
        return value.to_dict()
    return value


def _detect_mutations(obj, attributes):
    if not hasattr(obj, "__changes__"):
        obj.__changes__ = {}

    state = inspect(obj)
    for key in attributes:
        value = getattr(obj, key, None)
        if isinstance(value, MutableBase):
            attr = getattr(state.attrs, key, None)
            if attr:
                attr.load_history()
                if attr.history and attr.history.has_changes():
                    obj.__changes__[key] = {
                        "previous": value,
                        "current": value,
                    }


def _get_object_changes(obj, reset=True):
    result = {}
    changes = getattr(obj, "__changes__", None)

    if changes:
        columns = {}
        for attr in inspect(obj.__class__).column_attrs:
            col, = attr.columns
            columns[attr.key] = col.name

        for key, change in changes.items():
            if change["current"] != change["previous"]:
                col = columns.get(key, key)
                result[col] = (_to_json(change["previous"]), _to_json(change["current"]))
            elif isinstance(change["current"], MutableBase):
                col = columns.get(key, key)
                result[col] = (_to_json(change["current"]),)

        if reset:
            changes.clear()

    return result if result else None


def _collect_all_attributes(obj, attributes, reset=True):
    result = {}

    columns = {}
    for attr in inspect(obj.__class__).column_attrs:
        col, = attr.columns
        columns[attr.key] = col.name

    for key in attributes:
        col = columns.get(key, key)
        value = getattr(obj, key, None)
        result[col] = (_to_json(value),)

    changes = getattr(obj, "__changes__", None)
    if changes and reset:
        changes.clear()

    return result


def _patch_setattr_method(cls, attributes):
    original_setattr = cls.__setattr__

    def new_setattr(self, key, value):
        if key in attributes:
            if not hasattr(self, "__changes__"):
                self.__changes__ = {}
            change = self.__changes__.get(key, {
                "previous": getattr(self, key, None),
                "current": None,
            })
            change["current"] = value
            self.__changes__[key] = change

        original_setattr(self, key, value)

    cls.__setattr__ = new_setattr


def _patch_clear_detected_changes_method(cls):
    def clear_detected_changes(self):
        changes = getattr(self, "__changes__", None)
        if changes:
            changes.clear()

    cls.clear_detected_changes = clear_detected_changes


def _patch_record_changes_method(cls, attributes, parent):
    def record_changes(self, changed_by, change_type=Change.Type.Modified):
        session = object_session(self)
        if not session:
            return

        changes = {}
        if change_type == Change.Type.Created:
            changes = _collect_all_attributes(self, attributes)
        if change_type == Change.Type.Modified:
            _detect_mutations(self, attributes)
            changes = _get_object_changes(self)

        if changes is None:
            return

        self_type = self.__table__.name
        self_id = self.id

        changes = Change(
            object_type=self_type,
            object_id=self_id,
            org=changed_by.org,
            user=changed_by,
            change={
                "object_type": self_type,
                "object_id": self_id,
                "change_type": change_type,
                "changes": changes,
            },
        )

        if parent:
            parent_type, parent_id = parent
            if isclass(parent_type):  # SQLAlchemy model
                changes.object_type = parent_type.__table__.name
            else:
                changes.object_type = getattr(self, parent_type, self_type)
            changes.object_id = getattr(self, parent_id, self_id)

        session.add(changes)

    cls.record_changes = record_changes


def track_changes(attributes, parent=None):
    attributes = set(attributes) - {"id", "created_at", "updated_at", "version"}

    # monkey-patch class because inheritance will break SQLAlchemy
    def decorator(cls):
        _patch_setattr_method(cls, attributes)
        _patch_record_changes_method(cls, attributes, parent)
        _patch_clear_detected_changes_method(cls)
        return cls

    return decorator
