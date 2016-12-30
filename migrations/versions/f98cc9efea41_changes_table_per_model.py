"""changes table per model

Revision ID: f98cc9efea41
Revises: 65fc9ede4746
Create Date: 2016-12-30 11:48:25.875346

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

import redash.models

# revision identifiers, used by Alembic.
revision = 'f98cc9efea41'
down_revision = '65fc9ede4746'
branch_labels = None
depends_on = None


def upgrade():
    changes = sa.table(
        'changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_type', sa.String(), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('object_version', sa.Integer(), nullable=False),
        sa.Column('change', redash.models.PseudoJSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False))

    dashboard_changes = op.create_table(
        'dashboards_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_version', sa.Integer(), nullable=False),
        sa.Column('change', redash.models.PseudoJSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['object_id'], ['dashboards.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'))

    queries_changes = op.create_table(
        'queries_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_version', sa.Integer(), nullable=False),
        sa.Column('change', redash.models.PseudoJSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['object_id'], ['queries.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'))

    op.execute(sa.insert(queries_changes).from_select(
        [queries_changes.c.object_version, queries_changes.c.change,
         queries_changes.c.created_at, queries_changes.c.object_id,
         queries_changes.c.user_id],
        sa.select([changes.c.object_version, changes.c.change,
                   changes.c.created_at, changes.c.object_id,
                   changes.c.user_id]).where(
                       changes.c.object_type == 'queries')))

    op.execute(sa.insert(dashboard_changes).from_select(
        [dashboard_changes.c.object_version, dashboard_changes.c.change,
         dashboard_changes.c.created_at, dashboard_changes.c.object_id,
         dashboard_changes.c.user_id],
        sa.select([changes.c.object_version, changes.c.change,
                   changes.c.created_at, changes.c.object_id,
                   changes.c.user_id]).where(
                       changes.c.object_type == 'dashboards')))
    op.drop_table('changes')


def downgrade():
    dashboards_changes = sa.table(
        'dashboards_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_version', sa.Integer(), nullable=False),
        sa.Column('change', redash.models.PseudoJSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False))

    queries_changes = sa.table(
        'queries_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_version', sa.Integer(), nullable=False),
        sa.Column('change', redash.models.PseudoJSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('object_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False))

    changes = op.create_table(
        'changes',
        sa.Column('object_type', sa.VARCHAR(length=255), autoincrement=False,
                  nullable=False),
        sa.Column('object_id', sa.INTEGER(), autoincrement=False,
                  nullable=False),
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('object_version', sa.INTEGER(), autoincrement=False,
                  nullable=False),
        sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('change', sa.TEXT(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True),
                  autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['user_id'], [u'users.id'],
                                name=u'changes_user_id_fkey'),
        sa.PrimaryKeyConstraint('id', name=u'changes_pkey'))
    sa.insert(changes).from_select(
        [changes.c.object_type, changes.c.object_id, changes.c.object_version,
         changes.c.user_id, changes.c.change, changes.c.created_at],
        sa.select([
            sa.literal_column('queries').label('object_type'),
            queries_changes.c.object_id, queries_changes.c.object_version,
            queries_changes.c.user_id, queries_changes.c.change,
            queries_changes.c.created_at]))
    sa.insert(changes).from_select(
        [changes.c.object_type, changes.c.object_id, changes.c.object_version,
         changes.c.user_id, changes.c.change, changes.c.created_at],
        sa.select([
            sa.literal_column('dashboards').label('object_type'),
            dashboards_changes.c.object_id, dashboards_changes.c.object_version,
            dashboards_changes.c.user_id, dashboards_changes.c.change,
            dashboards_changes.c.created_at]))
    op.drop_table('queries_changes')
    op.drop_table('dashboards_changes')
    # ### end Alembic commands ###
