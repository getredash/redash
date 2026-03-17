"""Remove create_query and create_dashboard from non-admin groups

Revision ID: 89a3f2e1b4c7
Revises: add_datasource_permissions
Create Date: 2025-02-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '89a3f2e1b4c7'
down_revision = 'add_datasource_permissions'
branch_labels = None
depends_on = None


def upgrade():
    # Add create_query and create_dashboard to admin groups
    connection = op.get_bind()
    
    # Add permissions to admin groups (groups that have 'admin' or 'super_admin' in their permissions)
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_append(array_append(permissions, 'create_query'::varchar), 'create_dashboard'::varchar)
        WHERE (permissions && ARRAY['admin'::varchar, 'super_admin'::varchar])
        AND NOT (permissions && ARRAY['create_query'::varchar])
    """))
    
    # Remove create_query and create_dashboard from all non-admin groups
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_remove(array_remove(permissions, 'create_query'::varchar), 'create_dashboard'::varchar)
        WHERE NOT (permissions && ARRAY['admin'::varchar, 'super_admin'::varchar])
    """))


def downgrade():
    # Remove create_query and create_dashboard from admin groups
    connection = op.get_bind()
    
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_remove(array_remove(permissions, 'create_query'::varchar), 'create_dashboard'::varchar)
        WHERE (permissions && ARRAY['admin'::varchar, 'super_admin'::varchar])
    """))
    
    # Add back create_query and create_dashboard to all non-admin groups that don't have them
    connection.execute(sa.text("""
        UPDATE groups
        SET permissions = array_append(array_append(permissions, 'create_query'::varchar), 'create_dashboard'::varchar)
        WHERE NOT (permissions && ARRAY['admin'::varchar, 'super_admin'::varchar])
        AND NOT (permissions && ARRAY['create_query'::varchar, 'create_dashboard'::varchar])
    """))
