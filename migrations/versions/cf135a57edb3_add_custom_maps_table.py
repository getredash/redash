"""Add custom_maps table

Revision ID: cf135a57edb3
Revises: db0aca1ebd32
Create Date: 2026-03-16 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "cf135a57edb3"
down_revision = "db0aca1ebd32"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "custom_maps",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("org_id", sa.Integer, sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("geojson", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("custom_maps_org_id_name", "custom_maps", ["org_id", "name"], unique=True)


def downgrade():
    op.drop_table("custom_maps")
