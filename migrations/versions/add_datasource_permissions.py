"""Add DataSource permissions to object_permissions table

Revision ID: add_datasource_permissions
Revises: add_object_permissions
Create Date: 2026-03-02 00:00:00.000000

This migration fixes the missing DataSource permissions in the RBAC system.
The add_object_permissions migration only created permissions for Queries and Dashboards,
but forgot to include DataSources, causing them to become invisible to users.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_datasource_permissions'
down_revision = 'add_object_permissions'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    
    # Add object_permissions for all data sources based on existing data_source_groups
    # This preserves the existing permission structure
    connection.execute("""
        INSERT INTO object_permissions (
            org_id, 
            group_id, 
            object_type, 
            object_id, 
            can_create, 
            can_read, 
            can_update, 
            can_delete, 
            created_at, 
            updated_at
        )
        SELECT DISTINCT 
            ds.org_id,
            dsg.group_id,
            'DataSource' as object_type,
            ds.id as object_id,
            false as can_create,
            true as can_read,
            CASE WHEN dsg.view_only = false THEN true ELSE false END as can_update,
            false as can_delete,
            NOW() as created_at,
            NOW() as updated_at
        FROM data_sources ds
        JOIN data_source_groups dsg ON ds.id = dsg.data_source_id
        WHERE NOT EXISTS (
            SELECT 1 FROM object_permissions op
            WHERE op.object_type = 'DataSource'
            AND op.object_id = ds.id
            AND op.group_id = dsg.group_id
        )
        ON CONFLICT (group_id, object_type, object_id) DO NOTHING
    """)
    
    # Ensure admin group has full access to all data sources
    connection.execute("""
        INSERT INTO object_permissions (
            org_id, 
            group_id, 
            object_type, 
            object_id, 
            can_create, 
            can_read, 
            can_update, 
            can_delete, 
            created_at, 
            updated_at
        )
        SELECT DISTINCT 
            ds.org_id,
            g.id as group_id,
            'DataSource' as object_type,
            ds.id as object_id,
            false as can_create,
            true as can_read,
            true as can_update,
            true as can_delete,
            NOW() as created_at,
            NOW() as updated_at
        FROM data_sources ds
        JOIN groups g ON ds.org_id = g.org_id
        WHERE g.name = 'admin'
          AND g.type = '1'
        ON CONFLICT (group_id, object_type, object_id) DO NOTHING
    """)


def downgrade():
    connection = op.get_bind()
    
    # Remove DataSource permissions
    connection.execute("""
        DELETE FROM object_permissions 
        WHERE object_type = 'DataSource'
    """)
