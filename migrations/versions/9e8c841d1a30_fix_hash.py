"""fix_hash

Revision ID: 9e8c841d1a30
Revises: 7205816877ec
Create Date: 2024-10-05 18:55:35.730573

"""
import logging
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table
from sqlalchemy import select

from redash.query_runner import BaseQueryRunner, get_query_runner


# revision identifiers, used by Alembic.
revision = '9e8c841d1a30'
down_revision = '7205816877ec'
branch_labels = None
depends_on = None


def update_query_hash(record):
    should_apply_auto_limit = record['options'].get("apply_auto_limit", False) if record['options'] else False
    query_runner = get_query_runner(record['type'], {}) if record['type'] else BaseQueryRunner({})
    query_text = record['query']

    parameters_dict = {p["name"]: p.get("value") for p in record['options'].get('parameters', [])} if record.options else {}
    if any(parameters_dict):
        print(f"Query {record['query_id']} has parameters. Hash might be incorrect.")

    return query_runner.gen_query_hash(query_text, should_apply_auto_limit)


def upgrade():
    conn = op.get_bind()

    metadata = sa.MetaData(bind=conn)
    queries = sa.Table("queries", metadata, autoload=True)
    data_sources = sa.Table("data_sources", metadata, autoload=True)

    joined_table = queries.outerjoin(data_sources, queries.c.data_source_id == data_sources.c.id)

    query = select([
        queries.c.id.label("query_id"),
        queries.c.query,
        queries.c.query_hash,
        queries.c.options,
        data_sources.c.id.label("data_source_id"),
        data_sources.c.type
    ]).select_from(joined_table)

    for record in conn.execute(query):
        new_hash = update_query_hash(record)
        print(f"Updating hash for query {record['query_id']} from {record['query_hash']} to {new_hash}")
        conn.execute(
            queries.update()
            .where(queries.c.id == record['query_id'])
            .values(query_hash=new_hash))


def downgrade():
    pass