"""Rename 'image_url' to 'profile_image_url'

 a revision was changed after we pulled it from upstream in m12, so it had to
 be fixed here.


Revision ID: f9571a5ab4f3
Revises: 40384fa03dd1
Create Date: 2018-01-18 18:04:07.943843
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'f9571a5ab4f3'
down_revision = '40384fa03dd1'
branch_labels = None
depends_on = None


def upgrade():
    # Upstream changed the column name in migration revision 7671dca4e604 --
    # see git revision 62e5e3892603502c5f3a6da277c33c73510b8819
    op.alter_column('users', 'image_url', new_column_name='profile_image_url')


def downgrade():
    op.alter_column('users', 'profile_image_url', new_column_name='image_url')
