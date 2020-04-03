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
    object_version = Column(db.Integer, default=0)
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
            "object_version": self.object_version,
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
            .order_by(cls.object_version.desc())
            .first()
        )


def get_object_changes(obj, reset=True):
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


def track_changes(attributes):
    attributes = set(attributes) - {"id", "created_at", "updated_at", "version"}

    def decorator(cls):
        class ChangeTracking(cls):
            __changes__ = {}

            def __setattr__(self, key, value):
                if key in attributes:
                    change = self.__changes__.get(key, {
                        "previous": getattr(self, key),
                        "current": None,
                    })
                    change["current"] = value
                    self.__changes__[key] = change

                super(ChangeTracking, self).__setattr__(key, value)

            def record_changes(self, changed_by, change_type=Change.Type.Modified):
                session = object_session(self)
                if not session:
                    return

                changes = get_object_changes(self)
                if not changes:
                    return

                session.add(
                    Change(
                        object=self,
                        object_version=self.version,
                        user=changed_by,
                        change={
                            "type": change_type,
                            "changes": changes,
                        },
                    )
                )

        return ChangeTracking

    return decorator
