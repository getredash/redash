from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'tsv', models.Query.tsv)
        )
        db.database.execute_sql("CREATE INDEX tsv_idx ON queries USING gin(tsv)")
        db.database.execute_sql("UPDATE queries SET tsv = setweight(to_tsvector(coalesce(name, '')), 'A') || setweight(to_tsvector(coalesce(description, '')), 'B') || setweight(to_tsvector(coalesce(query, '')), 'C')")
        db.database.execute_sql("""
CREATE FUNCTION query_search_trigger() RETURNS trigger AS $f$
begin
  new.tsv :=
      setweight(to_tsvector(coalesce(new.name, '')), 'A') ||
      setweight(to_tsvector(coalesce(new.description, '')), 'B') ||
      setweight(to_tsvector(coalesce(new.query, '')), 'C');
  return new;
end
$f$ LANGUAGE plpgsql;
""")
        db.database.execute_sql("CREATE TRIGGER query_tsvectorupdate BEFORE INSERT OR UPDATE ON queries FOR EACH ROW EXECUTE PROCEDURE query_search_trigger();")
    db.close_db(None)
