from click import argument
from flask.cli import AppGroup
from sqlalchemy.orm.exc import NoResultFound

manager = AppGroup(help="Queries management commands.")


@manager.command(name="rehash")
def rehash():
    from redash import models

    for q in models.Query.query.all():
        old_hash = q.query_hash
        q.update_query_hash()
        new_hash = q.query_hash

        if old_hash != new_hash:
            print(f"Query {q.id} has changed hash from {old_hash} to {new_hash}")
            models.db.session.add(q)

    models.db.session.commit()


@manager.command(name="add_tag")
@argument("query_id")
@argument("tag")
def add_tag(query_id, tag):
    from redash import models

    query_id = int(query_id)

    try:
        q = models.Query.get_by_id(query_id)
    except NoResultFound:
        print("Query not found.")
        exit(1)

    tags = q.tags
    if tags is None:
        tags = []
    tags.append(tag)
    q.tags = list(set(tags))

    models.db.session.add(q)
    models.db.session.commit()

    print("Tag added.")


@manager.command(name="remove_tag")
@argument("query_id")
@argument("tag")
def remove_tag(query_id, tag):
    from redash import models

    query_id = int(query_id)

    try:
        q = models.Query.get_by_id(query_id)
    except NoResultFound:
        print("Query not found.")
        exit(1)

    tags = q.tags
    if tags is None:
        print("Tag is empty.")
        exit(1)

    try:
        tags.remove(tag)
    except ValueError:
        print("Tag not found.")
        exit(1)

    q.tags = list(set(tags))

    models.db.session.add(q)
    models.db.session.commit()

    print("Tag removed.")
