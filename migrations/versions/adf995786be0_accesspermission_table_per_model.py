"""accesspermission table per model

Revision ID: adf995786be0
Revises: f98cc9efea41
Create Date: 2016-12-30 23:18:13.201103

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'adf995786be0'
down_revision = 'f98cc9efea41'
branch_labels = None
depends_on = None


def upgrade():
    access_permissions = sa.table(
        'access_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_type', sa.String(length=255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('object_type', sa.String(), nullable=False),
        sa.Column('grantor_id', sa.Integer(), nullable=False),
        sa.Column('grantee_id', sa.Integer(), nullable=False))

    dashboards_accesspermission = op.create_table(
        'dashboards_accesspermission',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_type', sa.String(length=255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('grantor_id', sa.Integer(), nullable=False),
        sa.Column('grantee_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['grantee_id'], ['users.id']),
        sa.ForeignKeyConstraint(['grantor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['object_id'], ['dashboards.id']),
        sa.PrimaryKeyConstraint('id'))

    queries_accesspermission = op.create_table(
        'queries_accesspermission',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_type', sa.String(length=255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('grantor_id', sa.Integer(), nullable=False),
        sa.Column('grantee_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['grantee_id'], ['users.id']),
        sa.ForeignKeyConstraint(['grantor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['object_id'], ['queries.id']),
        sa.PrimaryKeyConstraint('id'))

    op.execute(sa.insert(dashboards_accesspermission).from_select(
        [dashboards_accesspermission.c.access_type,
         dashboards_accesspermission.c.object_id,
         dashboards_accesspermission.c.grantor_id,
         dashboards_accesspermission.c.grantee_id],
        sa.select([access_permissions.c.access_type,
                   access_permissions.c.object_id,
                   access_permissions.c.grantor_id,
                   access_permissions.c.grantee_id])
        .where(access_permissions.c.object_type == 'dashboards')))

    op.execute(sa.insert(queries_accesspermission).from_select(
        [queries_accesspermission.c.access_type,
         queries_accesspermission.c.object_id,
         queries_accesspermission.c.grantor_id,
         queries_accesspermission.c.grantee_id],
        sa.select([access_permissions.c.access_type,
                   access_permissions.c.object_id,
                   access_permissions.c.grantor_id,
                   access_permissions.c.grantee_id])
        .where(access_permissions.c.object_type == 'queries')))
    op.drop_table('access_permissions')


def downgrade():
    dashboards_accesspermission = sa.table(
        'dashboards_accesspermission',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_type', sa.String(length=255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('grantor_id', sa.Integer(), nullable=False),
        sa.Column('grantee_id', sa.Integer(), nullable=False))

    queries_accesspermission = sa.table(
        'queries_accesspermission',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_type', sa.String(length=255), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('grantor_id', sa.Integer(), nullable=False),
        sa.Column('grantee_id', sa.Integer(), nullable=False))

    access_permissions = op.create_table(
        'access_permissions',
        sa.Column('object_type', sa.VARCHAR(length=255), autoincrement=False,
                  nullable=False),
        sa.Column('object_id', sa.INTEGER(), autoincrement=False,
                  nullable=False),
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('access_type', sa.VARCHAR(length=255), autoincrement=False,
                  nullable=False),
        sa.Column('grantor_id', sa.INTEGER(), autoincrement=False,
                  nullable=False),
        sa.Column('grantee_id', sa.INTEGER(), autoincrement=False,
                  nullable=False),
        sa.ForeignKeyConstraint(['grantee_id'], [u'users.id'],
                                name=u'access_permissions_grantee_id_fkey'),
        sa.ForeignKeyConstraint(['grantor_id'], [u'users.id'],
                                name=u'access_permissions_grantor_id_fkey'),
        sa.PrimaryKeyConstraint('id', name=u'access_permissions_pkey')
    )
    sa.insert(access_permissions).from_select(
        [access_permissions.c.object_type, access_permissions.c.object_id,
         access_permissions.c.access_type, access_permissions.c.grantor_id,
         access_permissions.c.grantee_id],
        sa.select([
            sa.literal_column('queries').label('object_type'),
            queries_accesspermission.c.object_id,
            queries_accesspermission.c.access_type,
            queries_accesspermission.c.grantor_id,
            queries_accesspermission.c.grantee_id]))
    sa.insert(access_permissions).from_select(
        [access_permissions.c.object_type, access_permissions.c.object_id,
         access_permissions.c.access_type, access_permissions.c.grantor_id,
         access_permissions.c.grantee_id],
        sa.select([
            sa.literal_column('dashboards').label('object_type'),
            dashboards_accesspermission.c.object_id,
            dashboards_accesspermission.c.access_type,
            dashboards_accesspermission.c.grantor_id,
            dashboards_accesspermission.c.grantee_id]))
    op.drop_table('queries_accesspermission')
    op.drop_table('dashboards_accesspermission')
    # ### end Alembic commands ###
