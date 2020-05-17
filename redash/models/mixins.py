from sqlalchemy.event import listens_for

from .base import db, Column


class TimestampMixin(object):
    updated_at = Column(db.DateTime(True), default=db.func.now(), nullable=False)
    created_at = Column(db.DateTime(True), default=db.func.now(), nullable=False)


@listens_for(TimestampMixin, "before_update", propagate=True)
def timestamp_before_update(mapper, connection, target):
    # Check if we really want to update the updated_at value
    if hasattr(target, "skip_updated_at"):
        return

    target.updated_at = db.func.now()


class BelongsToOrgMixin(object):
    @classmethod
    def get_by_id_and_org(cls, object_id, org, org_cls=None):
        query = cls.query.filter(cls.id == object_id)
        if org_cls is None:
            query = query.filter(cls.org == org)
        else:
            query = query.join(org_cls).filter(org_cls.org == org)
        return query.one()
