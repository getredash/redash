import sqlalchemy as sa
from sqlalchemy.orm import RelationshipProperty
from sqlalchemy.sql.expression import asc, desc, nullslast


def _labels(query):
    return {d["name"] for d in query.column_descriptions if isinstance(d["expr"], sa.sql.elements.Label)}


def _joined_table_names(query):
    names = set()

    def collect(from_clause):
        if isinstance(from_clause, sa.sql.expression.Join):
            collect(from_clause.left)
            collect(from_clause.right)
        elif getattr(from_clause, "name", None):
            names.add(from_clause.name)

    for from_clause in query.statement.get_final_froms():
        collect(from_clause)
    return names


def _entity_for_table(query, table_name):
    primary = query.column_descriptions[0]["entity"]
    if table_name is None:
        return primary
    # Only sort by tables the query already selects from; ordering by anything else
    # would add a cross join.
    if table_name not in _joined_table_names(query):
        return None
    for mapper in sa.inspect(primary).registry.mappers:
        if mapper.local_table.name == table_name:
            return mapper.class_
    return None


def _sort_expression(query, table_name, attr):
    if table_name is None and attr in _labels(query):
        return sa.text(attr)

    entity = _entity_for_table(query, table_name)
    if entity is None:
        return None

    descriptor = sa.inspect(entity).all_orm_descriptors.get(attr)
    if descriptor is None:
        return None
    expression = getattr(entity, attr)
    if isinstance(getattr(expression, "property", None), RelationshipProperty):
        return None
    return expression


def sort_query(query, *args):
    """
    Applies ORDER BY clauses for the given sort arguments, silently skipping ones that
    don't match the query.

    Each argument is a column, hybrid property or label name of the query's primary
    entity (e.g. "name"), or "<table>-<column>" for a table the query joins (e.g.
    "users-name"). A leading "-" sorts in descending order.
    """
    for arg in args:
        if not arg:
            continue

        direction = asc
        if arg.startswith("-"):
            direction = desc
            arg = arg[1:]

        table_name, _, attr = arg.rpartition("-")
        expression = _sort_expression(query, table_name or None, attr)
        if expression is not None:
            query = query.order_by(nullslast(direction(expression)))
    return query
