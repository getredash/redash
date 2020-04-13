from sqlalchemy.inspection import inspect
from sqlalchemy_utils.models import generic_repr
from sqlalchemy.orm import object_session

from enum import Enum

from .base import GFKBase, db, Column
from .types import PseudoJSON


@generic_repr("id", "object_type", "object_id", "created_at")
class Change(GFKBase, db.Model):
    class Type(str, Enum):  # `str` to make it json-serializable
        Created = "created"
        Modified = "modified"
        Deleted = "deleted"

    id = Column(db.Integer, primary_key=True)
    # 'object' defined in GFKBase
    user_id = Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship("User", backref="changes")
    change = Column(PseudoJSON)
    created_at = Column(db.DateTime(True), default=db.func.now())

    __tablename__ = "changes"

    def to_dict(self, full=True):
        d = {
            "id": self.id,
            "object_id": self.object_id,
            "object_type": self.object_type,
            "change_type": self.change_type,
            "change": self.change,
            "created_at": self.created_at,
        }

        if full:
            d["user"] = self.user.to_dict()
        else:
            d["user_id"] = self.user_id

        return d

    @classmethod
    def last_change(cls, obj):
        return (
            cls.query.filter(
                cls.object_id == obj.id, cls.object_type == obj.__class__.__tablename__
            )
            .order_by(cls.id.desc())
            .first()
        )


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
                result[col] = change

        if reset:
            changes.clear()

    return result


def _patch_setattr_method(cls, attributes):
    original_setattr = cls.__setattr__

    def new_setattr(self, key, value):
        if key in attributes:
            if not hasattr(self, "__changes__"):
                self.__changes__ = {}
            change = self.__changes__.get(key, {
                "previous": getattr(self, key),
                "current": None,
            })
            change["current"] = value
            self.__changes__[key] = change

        original_setattr(self, key, value)

    cls.__setattr__ = new_setattr


def _patch_record_changes_method(cls, parent_attr):
    def record_changes(self, changed_by, change_type=Change.Type.Modified):
        session = object_session(self)
        if not session:
            return

        changes = _get_object_changes(self)
        # for `created` and `deleted` log even empty changes set
        if not changes and (change_type == Change.Type.Modified):
            return

        changes = Change(
            object=self,
            user=changed_by,
            change={
                "object_type": self.__table__.name,
                "object_id": self.id,
                "change_type": change_type,
                "changes": changes,
            },
        )

        if parent_attr:
            changes.object = getattr(self, parent_attr, self)

        session.add(changes)

    cls.record_changes = record_changes


def track_changes(attributes, parent_attr=None):
    attributes = set(attributes) - {"id", "created_at", "updated_at", "version"}

    # monkey-patch class because inheritance will break SQLAlchemy
    def decorator(cls):
        _patch_setattr_method(cls, attributes)
        _patch_record_changes_method(cls, parent_attr)
        return cls

    return decorator
