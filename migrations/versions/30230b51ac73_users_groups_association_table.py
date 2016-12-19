"""users_groups_association_table

Revision ID: 30230b51ac73
Revises: 65fc9ede4746
Create Date: 2016-12-14 16:55:29.928270

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '30230b51ac73'
down_revision = '65fc9ede4746'
branch_labels = None
depends_on = None

users = sa.table(
    'users',
    sa.Column('id', sa.Integer, primary_key=True, nullable=False),
    sa.Column('org_id', sa.Integer, sa.ForeignKey('organizations.id'),
              nullable=False),
    sa.Column('name', sa.String(320), nullable=False),
    sa.Column('email', sa.String(320), nullable=False),
    sa.Column('password_hash', sa.String(128), nullable=True),
    sa.Column('groups', postgresql.ARRAY(sa.Integer),
              nullable=True),
    sa.Column('api_key', sa.String(40), unique=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
              onupdate=sa.ColumnDefault(sa.func.now()),
              default=sa.ColumnDefault(sa.func.now())),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
              default=sa.ColumnDefault(sa.func.now())))


def upgrade():
    user_group = op.create_table(
        'user_group',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'],
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete="CASCADE"))
    op.create_primary_key('user_group_pkey', 'user_group',
                          ['user_id', 'group_id'])
    op.execute(
        user_group.insert().from_select(
            [user_group.c.user_id,
             user_group.c.group_id],
            sa.select([users.c.id, sa.func.unnest(users.c.groups)], users)))
    op.drop_column('users', 'groups')


def downgrade():
    user_group = sa.table(
        'user_group',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False))
    op.add_column(
        'users',
        sa.Column('groups', postgresql.ARRAY(sa.Integer),
                  nullable=True))
    op.execute(
        users.update().values(
            groups=sa.func.array(sa.select([user_group.c.group_id])
                                 .where(users.c.id == user_group.c.user_id))))
    op.drop_table('user_group')
