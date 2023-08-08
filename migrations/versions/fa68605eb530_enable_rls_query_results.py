"""Enable RLS based on the db_role for QueryResults.

Revision ID: fa68605eb530
Revises: a3a44a6c0dec
Create Date: 2023-08-07 18:13:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "fa68605eb530"
down_revision = "a3a44a6c0dec"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE query_results ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY all_visible ON query_results
          USING (true);
        """
    )
    op.execute(
        """
        CREATE POLICY limited_visibility ON query_results
          AS RESTRICTIVE
          FOR SELECT
          TO limited_visibility
          USING (current_user = db_role);
        """
    )


def downgrade():
    op.execute("DROP POLICY limited_visibility on query_results")
    op.execute("DROP POLICY all_visible on query_results")
    op.execute("ALTER TABLE query_results DISABLE ROW LEVEL SECURITY")
