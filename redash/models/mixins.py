from sqlalchemy.event import listens_for
from sqlalchemy.sql import select

from redash.models.base import Column, db


class TimestampMixin:
    updated_at = Column(db.DateTime(True), default=db.func.now(), nullable=False)
    created_at = Column(db.DateTime(True), default=db.func.now(), nullable=False)


@listens_for(TimestampMixin, "before_update", propagate=True)
def timestamp_before_update(mapper, connection, target):
    # Check if we really want to update the updated_at value
    if hasattr(target, "skip_updated_at"):
        return

    target.updated_at = db.func.now()


class BelongsToOrgMixin:
    @classmethod
    def get_by_id_and_org(cls, object_id, org, org_cls=None):
        query = select(cls).where(cls.id == object_id)
        if org_cls is None:
            query = query.where(cls.org == org)
        else:
            query = query.join(org_cls).where(org_cls.org == org)
        return db.session.scalars(query).one()
