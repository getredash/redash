"""Add object_permissions table for RBAC

Revision ID: add_object_permissions
Revises: fd4fc850d7ea
Create Date: 2025-11-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_object_permissions'
down_revision = 'fd4fc850d7ea'
branch_labels = None
depends_on = None


def upgrade():
    # Create object_permissions table
    op.create_table(
        'object_permissions',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('object_type', sa.String(255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('can_create', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_read', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('can_update', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_delete', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes
    op.create_index(
        'object_permissions_group_object',
        'object_permissions',
        ['group_id', 'object_type', 'object_id']
    )
    
    # Create unique constraint
    op.create_unique_constraint(
        'unique_group_object_permission',
        'object_permissions',
        ['group_id', 'object_type', 'object_id']
    )
    
    # Add default permissions for existing queries and dashboards
    # Grant read permission ONLY to admin groups by default (admin-only visibility)
    connection = op.get_bind()
    
    # For queries: grant full permissions to admin group only
    connection.execute("""
        INSERT INTO object_permissions (org_id, group_id, object_type, object_id, can_create, can_read, can_update, can_delete, created_at, updated_at)
        SELECT DISTINCT 
            q.org_id,
            g.id as group_id,
            'Query' as object_type,
            q.id as object_id,
            false as can_create,
            true as can_read,
            true as can_update,
            true as can_delete,
            NOW() as created_at,
            NOW() as updated_at
        FROM queries q
        JOIN groups g ON q.org_id = g.org_id
        WHERE q.is_archived = false
          AND g.name = 'admin'
          AND g.type = 1
        ON CONFLICT (group_id, object_type, object_id) DO NOTHING
    """)
    
    # For dashboards: grant full permissions to admin group only
    connection.execute("""
        INSERT INTO object_permissions (org_id, group_id, object_type, object_id, can_create, can_read, can_update, can_delete, created_at, updated_at)
        SELECT DISTINCT 
            d.org_id,
            g.id as group_id,
            'Dashboard' as object_type,
            d.id as object_id,
            false as can_create,
            true as can_read,
            true as can_update,
            true as can_delete,
            NOW() as created_at,
            NOW() as updated_at
        FROM dashboards d
        JOIN groups g ON d.org_id = g.org_id
        WHERE d.is_archived = false
          AND g.name = 'admin'
          AND g.type = 1
        ON CONFLICT (group_id, object_type, object_id) DO NOTHING
    """)


def downgrade():
    op.drop_constraint('unique_group_object_permission', 'object_permissions', type_='unique')
    op.drop_index('object_permissions_group_object', table_name='object_permissions')
    op.drop_table('object_permissions')
