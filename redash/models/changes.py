from sqlalchemy.inspection import inspect
from sqlalchemy_utils.models import generic_repr

from .base import GFKBase, db, Column
from .types import PseudoJSON


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


class ChangeTrackingMixin(object):
    skipped_fields = ("id", "created_at", "updated_at", "version")
    _clean_values = None

    def __init__(self, *a, **kw):
        super(ChangeTrackingMixin, self).__init__(*a, **kw)
        self.record_changes(self.user)

    def prep_cleanvalues(self):
        self.__dict__["_clean_values"] = {}
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
                changes[col.name] = {
                    "previous": self._clean_values[col.name],
                    "current": getattr(self, attr.key),
                }

        db.session.add(
            Change(
                object=self,
                object_version=self.version,
                user=changed_by,
                change=changes,
            )
        )
