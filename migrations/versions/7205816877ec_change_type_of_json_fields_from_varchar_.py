"""change type of json fields from varchar to json

Revision ID: 7205816877ec
Revises: 7ce5925f832b
Create Date: 2024-01-03 13:55:18.885021

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, JSON


# revision identifiers, used by Alembic.
revision = '7205816877ec'
down_revision = '7ce5925f832b'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    op.alter_column('queries', 'options',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        nullable=True,
        postgresql_using='options::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('queries', 'schedule',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        nullable=True,
        postgresql_using='schedule::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('events', 'additional_properties',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        nullable=True,
        postgresql_using='additional_properties::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('organizations', 'settings',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        nullable=True,
        postgresql_using='settings::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('alerts', 'options',
        existing_type=JSON(astext_type=sa.Text()),
        type_=JSONB(astext_type=sa.Text()),
        nullable=True,
        postgresql_using='options::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('dashboards', 'options',
        existing_type=JSON(astext_type=sa.Text()),
        type_=JSONB(astext_type=sa.Text()),
        postgresql_using='options::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('dashboards', 'layout',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        postgresql_using='layout::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('changes', 'change',
        existing_type=JSON(astext_type=sa.Text()),
        type_=JSONB(astext_type=sa.Text()),
        postgresql_using='change::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('visualizations', 'options',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        postgresql_using='options::jsonb',
        server_default=sa.text("'{}'::jsonb"))
    op.alter_column('widgets', 'options',
        existing_type=sa.Text(),
        type_=JSONB(astext_type=sa.Text()),
        postgresql_using='options::jsonb',
        server_default=sa.text("'{}'::jsonb"))


def downgrade():
    connection = op.get_bind()
    op.alter_column('queries', 'options',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using='options::text',
        existing_nullable=True,
        server_default=sa.text("'{}'::text"))
    op.alter_column('queries', 'schedule',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using='schedule::text',
        existing_nullable=True,
        server_default=sa.text("'{}'::text"))
    op.alter_column('events', 'additional_properties',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using='additional_properties::text',
        existing_nullable=True,
        server_default=sa.text("'{}'::text"))
    op.alter_column('organizations', 'settings',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using='settings::text',
        existing_nullable=True,
        server_default=sa.text("'{}'::text"))
    op.alter_column('alerts', 'options',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=JSON(astext_type=sa.Text()),
        postgresql_using='options::json',
        existing_nullable=True,
        server_default=sa.text("'{}'::json"))
    op.alter_column('dashboards', 'options',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=JSON(astext_type=sa.Text()),
        postgresql_using='options::json',
        server_default=sa.text("'{}'::json"))
    op.alter_column('dashboards', 'layout',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using='layout::text',
        server_default=sa.text("'{}'::text"))
    op.alter_column('changes', 'change',
        existing_type=JSONB(astext_type=sa.Text()),
        type_=JSON(astext_type=sa.Text()),
        postgresql_using='change::json',
        server_default=sa.text("'{}'::json"))
    op.alter_column('visualizations', 'options',
        type_=sa.Text(),
        existing_type=JSONB(astext_type=sa.Text()),
        postgresql_using='options::text',
        server_default=sa.text("'{}'::text"))
    op.alter_column('widgets', 'options',
        type_=sa.Text(),
        existing_type=JSONB(astext_type=sa.Text()),
        postgresql_using='options::text',
        server_default=sa.text("'{}'::text"))
