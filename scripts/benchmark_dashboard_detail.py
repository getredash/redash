"""Measure dashboard-detail serialization as widget count grows.

Run against a disposable database, for example:

    REDASH_DATABASE_URL=postgresql://postgres@localhost:15432/redash_benchmark \
    REDASH_REDIS_URL=redis://localhost:6379/14 \
    REDASH_COOKIE_SECRET=benchmark REDASH_SECRET_KEY=benchmark \
    REDASH_MULTI_ORG=true PYTHONPATH=. \
    uv run python scripts/benchmark_dashboard_detail.py

The script drops and recreates every table in the configured database.
"""

import argparse
import statistics
import time
from contextlib import contextmanager

from sqlalchemy import event

from redash import limiter
from redash.app import create_app
from redash.models import Dashboard, Query, Visualization, Widget, db
from redash.tasks import record_event
from tests import authenticate_request
from tests.factories import Factory


@contextmanager
def count_sql(engine):
    statements = []

    def capture(_conn, _cursor, statement, _parameters, _context, _executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", capture)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", capture)


def create_query(factory, index):
    return Query(
        name=f"Query {index}",
        description="Representative dashboard query",
        query_text=f"SELECT {index}",
        user=factory.user,
        last_modified_by=factory.user,
        data_source=factory.data_source,
        org=factory.org,
        is_archived=False,
        is_draft=False,
        schedule=None,
        options={},
        tags=[],
    )


def build_workload(widget_count):
    factory = Factory()
    dashboard = Dashboard(
        name=f"Benchmark {widget_count}",
        org=factory.org,
        user=factory.user,
        is_draft=False,
        layout=[],
    )
    db.session.add(dashboard)

    for index in range(widget_count):
        visualization = Visualization(
            type="CHART",
            name=f"Chart {index}",
            description="",
            options={"globalSeriesType": "column"},
            query_rel=create_query(factory, index),
        )
        db.session.add(
            Widget(
                dashboard=dashboard,
                visualization=visualization,
                width=1,
                options={},
            )
        )

    db.session.commit()
    return factory.org, factory.user, f"/api/dashboards/{dashboard.id}"


def run_workload(app, widget_count, iterations):
    db.session.close()
    db.drop_all()
    db.create_all()
    org, user, path = build_workload(widget_count)

    client = app.test_client()
    authenticate_request(client, user)
    record_event.delay = lambda *args, **kwargs: None
    url = f"/{org.slug}{path}"
    engine = db.get_engine(app)

    samples = []
    with count_sql(engine) as statements:
        for iteration in range(iterations + 2):
            statements.clear()
            wall_started = time.perf_counter()
            cpu_started = time.process_time()
            response = client.get(url)
            wall_seconds = time.perf_counter() - wall_started
            cpu_seconds = time.process_time() - cpu_started
            if response.status_code != 200:
                raise RuntimeError(response.data)
            if iteration >= 2:
                samples.append((wall_seconds, cpu_seconds, len(statements)))

    return {
        "widgets": widget_count,
        "iterations": iterations,
        "wall_ms_median": statistics.median(sample[0] for sample in samples) * 1000,
        "cpu_ms_median": statistics.median(sample[1] for sample in samples) * 1000,
        "sql_statements_median": statistics.median(sample[2] for sample in samples),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--widgets", type=int, nargs="+", default=[10, 50, 100])
    parser.add_argument("--iterations", type=int, default=15)
    args = parser.parse_args()

    app = create_app()
    app.config["TESTING"] = True
    limiter.enabled = False

    with app.app_context():
        for widget_count in args.widgets:
            print(run_workload(app, widget_count, args.iterations))


if __name__ == "__main__":
    main()
