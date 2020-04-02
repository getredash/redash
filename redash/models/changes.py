from sqlalchemy.inspection import inspect
from sqlalchemy_utils.models import generic_repr
from sqlalchemy.orm.session import Session
from sqlalchemy import event

from .base import GFKBase, db, Column
from .types import PseudoJSON

import logging


@generic_repr("id", "object_type", "object_id", "created_at")
class Change(GFKBase, db.Model):
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


def record_object_changes(session, obj, action):
    changes = get_object_changes(obj)
    if changes:
        session.add(
            Change(
                object=obj,
                object_version=obj.version,
                # user=changed_by,
                user_id=1,  # TODO: current user - ?
                change={
                    "type": action,
                    "changes": changes,
                },
            )
        )


@event.listens_for(Session, 'after_flush')
def handle_before_flush(session, flush_context):
    # It's safe to insert new records, but do not read anything from DB here!
    for obj in session.new:
        record_object_changes(session, obj, "created")
    for obj in session.dirty:
        record_object_changes(session, obj, "modified")
    for obj in session.deleted:
        record_object_changes(session, obj, "deleted")


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

        return ChangeTracking

    return decorator
