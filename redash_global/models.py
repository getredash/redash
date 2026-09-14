from flask_login import UserMixin
from passlib.apps import custom_app_context as pwd_context
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import validates
from sqlalchemy_utils.models import generic_repr

from redash.models.base import Column, db, primary_key
from redash.models.mixins import TimestampMixin
from redash.utils import slugify


@generic_repr("id", "username")
class GlobalAdminUser(UserMixin, TimestampMixin, db.Model):
    __tablename__ = "global_admin_users"

    id = primary_key("GlobalAdminUser")
    username = Column(db.String(255), unique=True, nullable=False)
    password_hash = Column(db.String(128), nullable=False)

    def hash_password(self, password):
        """Hash and store the given password using passlib."""
        self.password_hash = pwd_context.hash(password)

    def verify_password(self, password):
        """Verify a password against the stored hash."""
        return self.password_hash and pwd_context.verify(password, self.password_hash)

    @classmethod
    def get_by_username(cls, username):
        """Return the user with the given username, or None."""
        return cls.query.filter(cls.username == username).first()


@generic_repr("id", "dashboard_id", "organization_id")
class SubDashboardAssignment(TimestampMixin, db.Model):
    __tablename__ = "sub_dashboard_assignments"
    __table_args__ = (db.UniqueConstraint("dashboard_id", "organization_id", name="uq_sub_dashboard_assignment"),)

    id = primary_key("SubDashboardAssignment")
    dashboard_id = Column(db.Integer, db.ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)


@generic_repr("id", "url_identifier", "name")
class ComposedDashboard(TimestampMixin, db.Model):
    __tablename__ = "composed_dashboards"

    id = primary_key("ComposedDashboard")
    url_identifier = Column(db.String(100), unique=True, nullable=False)
    name = Column(db.String(100), nullable=False)

    entries = db.relationship(
        "ComposedDashboardEntry",
        backref="composed_dashboard",
        order_by="ComposedDashboardEntry.order_index",
        cascade="all, delete-orphan",
    )
    deployments = db.relationship(
        "ComposedDashboardDeployment",
        backref="composed_dashboard",
        cascade="all, delete-orphan",
    )

    @validates("url_identifier")
    def validate_url_identifier(self, key, value):
        # TODO move to handler later
        if not value or value != slugify(value):
            raise ValueError(f"{value!r} is not a valid slug")
        return value


@generic_repr("id", "composed_dashboard_id", "template_dashboard_id", "order_index")
class ComposedDashboardEntry(TimestampMixin, db.Model):
    __tablename__ = "composed_dashboard_entries"
    __table_args__ = (
        db.UniqueConstraint("composed_dashboard_id", "template_dashboard_id", name="uq_composed_dashboard_entry"),
    )

    id = primary_key("ComposedDashboardEntry")
    composed_dashboard_id = Column(
        db.Integer, db.ForeignKey("composed_dashboards.id", ondelete="CASCADE"), nullable=False
    )
    template_dashboard_id = Column(db.Integer, db.ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(db.Integer, nullable=False)


@generic_repr("id", "composed_dashboard_id", "organization_id", "last_deployed_at")
class ComposedDashboardDeployment(TimestampMixin, db.Model):
    __tablename__ = "composed_dashboard_deployments"
    __table_args__ = (
        db.UniqueConstraint("composed_dashboard_id", "organization_id", name="uq_composed_dashboard_deployment"),
    )

    id = primary_key("ComposedDashboardDeployment")
    composed_dashboard_id = Column(
        db.Integer, db.ForeignKey("composed_dashboards.id", ondelete="CASCADE"), nullable=False
    )
    organization_id = Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    last_deployed_at = Column(db.DateTime(True), nullable=True)


@generic_repr("id", "composed_dashboard_id", "succeeded")
class DeploymentRun(TimestampMixin, db.Model):
    """One click of Deploy: when, who ran it, which orgs are targeted(throught results), and whether it committed.

    A run is all or nothing: `succeeded` is False if any target org failed, and then no
    org was deployed. To be recorded after the deploy's own commit/rollback so that the history
    of a failed run is not rolled back with it.
    """

    __tablename__ = "deployment_runs"

    id = primary_key("DeploymentRun")
    composed_dashboard_id = Column(
        db.Integer, db.ForeignKey("composed_dashboards.id", ondelete="CASCADE"), nullable=False
    )
    global_admin_user_id = Column(
        db.Integer, db.ForeignKey("global_admin_users.id", ondelete="RESTRICT"), nullable=False
    )
    succeeded = Column(db.Boolean, nullable=False)
    comment = Column(db.Text, nullable=True)

    results = db.relationship(
        "DeploymentRunResult",
        backref="deployment_run",
        cascade="all, delete-orphan",
    )
    global_admin_user = db.relationship("GlobalAdminUser")


@generic_repr("id", "deployment_run_id", "organization_id")
class DeploymentRunResult(TimestampMixin, db.Model):
    """What one org contributed to one run: nothing, or the errors that failed the run.

    Empty errors means this org raised no problems, not that it was deployed - in a failed
    run every org is rolled back, including the ones with no errors of their own.
    """

    __tablename__ = "deployment_run_results"

    id = primary_key("DeploymentRunResult")
    deployment_run_id = Column(db.Integer, db.ForeignKey("deployment_runs.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    errors = Column(JSONB, nullable=False, default=list)
