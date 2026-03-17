"""Add list_data_sources permission to admin groups

Revision ID: add_list_datasources_permission
Revises: add_datasource_permissions, 89a3f2e1b4c7, db0aca1ebd32
Create Date: 2026-03-02 18:15:00.000000

This migration adds the list_data_sources permission to admin groups,
which is required for the DataSourceListResource API endpoint.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_list_datasources_permission'
down_revision = ('add_datasource_permissions', '89a3f2e1b4c7', 'db0aca1ebd32')
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    # Add list_data_sources permission to admin groups
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_append(permissions, 'list_data_sources')
        WHERE name = 'admin'
        AND type = 'builtin'
        AND NOT ('list_data_sources' = ANY(permissions))
    """))


def downgrade():
    connection = op.get_bind()

    # Remove list_data_sources permission from admin groups
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_remove(permissions, 'list_data_sources')
        WHERE name = 'admin'
        AND type = 'builtin'
    """))
