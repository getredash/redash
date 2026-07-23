import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from redash import create_app
from redash.models import Dashboard, DataSource, Organization, Query, User, Visualization, Widget, db, init_db
from redash.query_runner import get_configuration_schema_for_query_runner_type
from redash.utils.configuration import ConfigurationContainer


def ensure_default_org():
    org = Organization.query.filter(Organization.slug == "default").first()
    if org is None:
        org, _admin_group, _default_group = init_db()
    return org


def ensure_admin_user(org):
    email = "admin@redash.io"
    user = User.query.filter(User.email == email, User.org == org).first()

    if user is None:
        user = User(
            org=org,
            name="Example Admin",
            email=email,
            group_ids=[org.admin_group.id, org.default_group.id],
        )
        user.hash_password("password")
        db.session.add(user)
        db.session.flush()

    return user


def ensure_demo_data_source(org):
    name = "Demo PostgreSQL"
    ds = DataSource.query.filter(DataSource.org == org, DataSource.name == name).first()

    if ds is None:
        schema = get_configuration_schema_for_query_runner_type("pg")
        options = ConfigurationContainer(
            {
                "dbname": "postgres",
                "host": "postgres",
                "port": 5432,
                "sslmode": "prefer",
                "user": "postgres",
            },
            schema,
        )
        ds = DataSource.create_with_group(name=name, type="pg", options=options, org=org)
        db.session.flush()

    return ds


def ensure_demo_event_table():
    db.session.execute(
        """
        CREATE TABLE IF NOT EXISTS demo_security_events (
            id SERIAL PRIMARY KEY,
            event_type VARCHAR(64) NOT NULL,
            severity VARCHAR(16) NOT NULL,
            source_ip VARCHAR(45) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        """
    )

    db.session.execute(
        """
        INSERT INTO demo_security_events (event_type, severity, source_ip, created_at)
        SELECT v.event_type, v.severity, v.source_ip, v.created_at
        FROM (
            VALUES
                ('login_failed','high','10.0.1.15', NOW() - INTERVAL '5 minutes'),
                ('malware_detected','critical','10.0.2.31', NOW() - INTERVAL '15 minutes'),
                ('port_scan','medium','10.0.3.44', NOW() - INTERVAL '25 minutes'),
                ('privilege_escalation','high','10.0.4.9', NOW() - INTERVAL '35 minutes'),
                ('usb_device_connected','low','10.0.5.77', NOW() - INTERVAL '45 minutes'),
                ('vpn_bruteforce','critical','10.0.8.21', NOW() - INTERVAL '65 minutes'),
                ('dns_tunnel_suspect','medium','10.0.8.22', NOW() - INTERVAL '95 minutes'),
                ('ransomware_activity','critical','10.0.8.23', NOW() - INTERVAL '125 minutes'),
                ('new_admin_user','high','10.0.8.24', NOW() - INTERVAL '155 minutes'),
                ('lateral_movement','high','10.0.8.25', NOW() - INTERVAL '185 minutes'),
                ('c2_beaconing','medium','10.0.8.26', NOW() - INTERVAL '215 minutes'),
                ('suspicious_powershell','high','10.0.8.27', NOW() - INTERVAL '245 minutes')
        ) AS v(event_type, severity, source_ip, created_at)
        WHERE NOT EXISTS (
            SELECT 1
            FROM demo_security_events d
            WHERE d.event_type = v.event_type
              AND d.source_ip = v.source_ip
              AND d.created_at::date = v.created_at::date
        )
        """
    )


def ensure_demo_query(org, user, data_source, name, description, query_text):
    query = Query.query.filter(Query.org == org, Query.name == name).first()

    if query is None:
        query = Query.create(
            name=name,
            description=description,
            query_text=query_text,
            user=user,
            org=org,
            data_source=data_source,
            is_archived=False,
            is_draft=False,
            schedule=None,
        )
        db.session.add(query)
        db.session.flush()
    else:
        query.description = description
        query.query_text = query_text
        query.data_source = data_source
        query.user = user
        query.is_archived = False
        query.is_draft = False
        query.schedule = None
        db.session.add(query)
        db.session.flush()

    return query


def get_visualization(query, vis_type=None, name=None):
    visualizations = Visualization.query.filter(Visualization.query_rel == query)
    if vis_type is not None:
        visualizations = visualizations.filter(Visualization.type == vis_type)
    if name is not None:
        visualizations = visualizations.filter(Visualization.name == name)
    return visualizations.first()


def ensure_visualization(query, vis_type, name, description, options):
    visualization = get_visualization(query, vis_type=vis_type, name=name)
    options_json = json.dumps(options, separators=(",", ":"))

    if visualization is None:
        visualization = Visualization(
            query_rel=query,
            type=vis_type,
            name=name,
            description=description,
            options=options_json,
        )
        db.session.add(visualization)
    else:
        visualization.type = vis_type
        visualization.description = description
        visualization.options = options_json
        db.session.add(visualization)

    db.session.flush()
    return visualization


def ensure_chart_visualization(query, name, description, options):
    return ensure_visualization(query, "CHART", name, description, options)


def ensure_counter_visualization(query, name, description, options):
    return ensure_visualization(query, "COUNTER", name, description, options)


def chart_series_options(*series_defs):
    return {
        item["name"]: {
            "type": item.get("type", "line"),
            "yAxis": item.get("yAxis", 0),
            "zIndex": item.get("zIndex", 0),
            "index": item.get("index", 0),
            "color": item.get("color"),
        }
        for item in series_defs
    }


def ensure_widget(dashboard, visualization, col, row, size_x=6, size_y=6):
    widget = Widget.query.filter(
        Widget.dashboard == dashboard, Widget.visualization == visualization
    ).first()

    options = (
        '{"position":{"autoHeight":false,'
        '"sizeX":' + str(size_x) + ','
        '"sizeY":' + str(size_y) + ','
        '"maxSizeY":1000,'
        '"minSizeY":1,'
        '"maxSizeX":12,'
        '"minSizeX":1,'
        '"col":' + str(col) + ','
        '"row":' + str(row) +
        '}}'
    )

    if widget is None:
        widget = Widget(width=1, options=options, dashboard=dashboard, visualization=visualization)
        db.session.add(widget)
    else:
        widget.options = options
        db.session.add(widget)

    db.session.flush()


def ensure_demo_dashboard(org, user, name, widget_specs):
    dashboard = Dashboard.query.filter(Dashboard.org == org, Dashboard.name == name).first()

    if dashboard is None:
        dashboard = Dashboard(
            name=name,
            user=user,
            org=org,
            layout="[]",
            is_draft=False,
            dashboard_filters_enabled=True,
        )
        db.session.add(dashboard)
        db.session.flush()

    desired_visualization_ids = set()
    desired_query_ids = set()

    for spec in widget_specs:
        visualization = spec.get("visualization")
        if visualization is None:
            query = spec.get("query")
            visualization = get_visualization(query, vis_type=spec.get("vis_type", "TABLE")) if query else None

        if visualization is None:
            continue

        desired_visualization_ids.add(visualization.id)
        desired_query_ids.add(visualization.query_id)

        ensure_widget(
            dashboard=dashboard,
            visualization=visualization,
            col=spec.get("col", 0),
            row=spec.get("row", 0),
            size_x=spec.get("size_x", 6),
            size_y=spec.get("size_y", 6),
        )

    for widget in dashboard.widgets.all():
        if widget.visualization is None:
            continue

        query_id = widget.visualization.query_id
        if query_id in desired_query_ids and widget.visualization_id not in desired_visualization_ids:
            db.session.delete(widget)

    return dashboard


def main():
    app = create_app()
    with app.app_context():
        org = ensure_default_org()
        user = ensure_admin_user(org)
        ensure_demo_event_table()
        ds = ensure_demo_data_source(org)

        recent_query = ensure_demo_query(
            org=org,
            user=user,
            data_source=ds,
            name="Demo - Security Events (Last 20)",
            description="Latest security events for SOC overview",
            query_text=(
                "SELECT id, event_type, severity, source_ip, created_at "
                "FROM demo_security_events "
                "ORDER BY created_at DESC "
                "LIMIT 20"
            ),
        )
        severity_query = ensure_demo_query(
            org=org,
            user=user,
            data_source=ds,
            name="Demo - Severity Distribution",
            description="Count events by severity",
            query_text=(
                "SELECT severity, COUNT(*) AS total_events "
                "FROM demo_security_events "
                "GROUP BY severity "
                "ORDER BY total_events DESC, severity"
            ),
        )
        trend_query = ensure_demo_query(
            org=org,
            user=user,
            data_source=ds,
            name="Demo - Hourly Event Trend",
            description="Hourly trend of event volume",
            query_text=(
                "SELECT date_trunc('hour', created_at) AS hour_bucket, COUNT(*) AS total_events "
                "FROM demo_security_events "
                "GROUP BY 1 "
                "ORDER BY 1 DESC "
                "LIMIT 24"
            ),
        )
        source_query = ensure_demo_query(
            org=org,
            user=user,
            data_source=ds,
            name="Demo - Top Source IPs",
            description="Top source IPs by event count",
            query_text=(
                "SELECT source_ip, COUNT(*) AS total_events "
                "FROM demo_security_events "
                "GROUP BY source_ip "
                "ORDER BY total_events DESC, source_ip "
                "LIMIT 10"
            ),
        )
        kpi_query = ensure_demo_query(
            org=org,
            user=user,
            data_source=ds,
            name="Demo - SOC KPI Snapshot",
            description="Single-row KPI snapshot for executive counter cards",
            query_text=(
                "SELECT "
                "COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS total_events_24h, "
                "COUNT(*) FILTER (WHERE severity='critical' AND created_at >= NOW() - INTERVAL '24 hours') AS critical_events_24h, "
                "COUNT(*) FILTER (WHERE severity='high' AND created_at >= NOW() - INTERVAL '24 hours') AS high_events_24h, "
                "MAX(created_at) AS latest_event_at "
                "FROM demo_security_events"
            ),
        )

        severity_chart = ensure_chart_visualization(
            query=severity_query,
            name="Severity Distribution Chart",
            description="Bar chart of security event counts by severity",
            options={
                "globalSeriesType": "column",
                "sortX": True,
                "xAxis": {"type": "category", "labels": {"enabled": True}},
                "yAxis": [{"type": "linear"}, {"type": "linear", "opposite": True}],
                "legend": {"enabled": True, "placement": "bottom"},
                "series": {"stacking": None},
                "showDataLabels": True,
                "numberFormat": "0,0",
                "seriesOptions": chart_series_options(
                    {
                        "name": "total_events",
                        "type": "column",
                        "yAxis": 0,
                        "zIndex": 0,
                        "index": 0,
                        "color": "#ef6c00",
                    }
                ),
                "columnMapping": {"severity": "x", "total_events": "y"},
            },
        )
        severity_pie_chart = ensure_chart_visualization(
            query=severity_query,
            name="Severity Breakdown Pie",
            description="Executive pie view of severity distribution",
            options={
                "globalSeriesType": "pie",
                "sortX": True,
                "legend": {"enabled": True, "placement": "right"},
                "showDataLabels": True,
                "numberFormat": "0,0",
                "seriesOptions": chart_series_options(
                    {
                        "name": "total_events",
                        "type": "pie",
                        "yAxis": 0,
                        "zIndex": 0,
                        "index": 0,
                        "color": "#f57c00",
                    }
                ),
                "columnMapping": {"severity": "x", "total_events": "y"},
            },
        )
        trend_chart = ensure_chart_visualization(
            query=trend_query,
            name="Hourly Event Trend Chart",
            description="Line chart of event volume by hour",
            options={
                "globalSeriesType": "line",
                "sortX": True,
                "xAxis": {"type": "datetime", "labels": {"enabled": True}},
                "yAxis": [{"type": "linear"}, {"type": "linear", "opposite": True}],
                "legend": {"enabled": True, "placement": "bottom"},
                "series": {"stacking": None},
                "showDataLabels": False,
                "numberFormat": "0,0",
                "seriesOptions": chart_series_options(
                    {
                        "name": "total_events",
                        "type": "line",
                        "yAxis": 0,
                        "zIndex": 0,
                        "index": 0,
                        "color": "#1565c0",
                    }
                ),
                "columnMapping": {"hour_bucket": "x", "total_events": "y"},
            },
        )
        source_chart = ensure_chart_visualization(
            query=source_query,
            name="Top Source IPs Chart",
            description="Top source IPs by event count",
            options={
                "globalSeriesType": "column",
                "sortX": False,
                "xAxis": {"type": "category", "labels": {"enabled": True}},
                "yAxis": [{"type": "linear"}, {"type": "linear", "opposite": True}],
                "legend": {"enabled": False},
                "series": {"stacking": None},
                "showDataLabels": True,
                "numberFormat": "0,0",
                "seriesOptions": chart_series_options(
                    {
                        "name": "total_events",
                        "type": "column",
                        "yAxis": 0,
                        "zIndex": 0,
                        "index": 0,
                        "color": "#00897b",
                    }
                ),
                "columnMapping": {"source_ip": "x", "total_events": "y"},
            },
        )
        critical_counter = ensure_counter_visualization(
            query=kpi_query,
            name="Critical Events 24h",
            description="Executive KPI for critical events in the last 24 hours",
            options={
                "counterLabel": "Critical Events (24h)",
                "counterColName": "critical_events_24h",
                "targetColName": "high_events_24h",
                "rowNumber": 1,
                "targetRowNumber": 1,
                "stringDecimal": 0,
                "stringDecChar": ".",
                "stringThouSep": ",",
                "tooltipFormat": "0,0",
                "formatTargetValue": True,
                "countRow": False,
            },
        )
        high_counter = ensure_counter_visualization(
            query=kpi_query,
            name="High Events 24h",
            description="Executive KPI for high severity events in the last 24 hours",
            options={
                "counterLabel": "High Events (24h)",
                "counterColName": "high_events_24h",
                "targetColName": "critical_events_24h",
                "rowNumber": 1,
                "targetRowNumber": 1,
                "stringDecimal": 0,
                "stringDecChar": ".",
                "stringThouSep": ",",
                "tooltipFormat": "0,0",
                "formatTargetValue": True,
                "countRow": False,
            },
        )
        total_counter = ensure_counter_visualization(
            query=kpi_query,
            name="Total Events 24h",
            description="Executive KPI for total events in the last 24 hours",
            options={
                "counterLabel": "Total Events (24h)",
                "counterColName": "total_events_24h",
                "targetColName": "high_events_24h",
                "rowNumber": 1,
                "targetRowNumber": 1,
                "stringDecimal": 0,
                "stringDecChar": ".",
                "stringThouSep": ",",
                "tooltipFormat": "0,0",
                "formatTargetValue": True,
                "countRow": False,
            },
        )

        overview_dashboard = ensure_demo_dashboard(
            org=org,
            user=user,
            name="Demo - SOC Overview",
            widget_specs=[
                {"query": recent_query, "col": 0, "row": 0, "size_x": 12, "size_y": 7},
                {"visualization": severity_chart, "col": 0, "row": 7, "size_x": 6, "size_y": 5},
                {"visualization": trend_chart, "col": 6, "row": 7, "size_x": 6, "size_y": 5},
            ],
        )
        triage_dashboard = ensure_demo_dashboard(
            org=org,
            user=user,
            name="Demo - Incident Triage",
            widget_specs=[
                {"query": recent_query, "col": 0, "row": 0, "size_x": 8, "size_y": 8},
                {"visualization": severity_chart, "col": 8, "row": 0, "size_x": 4, "size_y": 4},
                {"visualization": trend_chart, "col": 8, "row": 4, "size_x": 4, "size_y": 4},
            ],
        )
        executive_dashboard = ensure_demo_dashboard(
            org=org,
            user=user,
            name="Demo - Executive Summary",
            widget_specs=[
                {"visualization": total_counter, "col": 0, "row": 0, "size_x": 3, "size_y": 4},
                {"visualization": high_counter, "col": 3, "row": 0, "size_x": 3, "size_y": 4},
                {"visualization": critical_counter, "col": 6, "row": 0, "size_x": 3, "size_y": 4},
                {"visualization": severity_pie_chart, "col": 9, "row": 0, "size_x": 3, "size_y": 4},
                {"visualization": trend_chart, "col": 0, "row": 4, "size_x": 12, "size_y": 5},
                {"visualization": source_chart, "col": 0, "row": 9, "size_x": 12, "size_y": 5},
            ],
        )

        db.session.commit()

        print("Seed completed")
        print("Organization:", org.slug)
        print("Admin:", user.email)
        print("Data source:", ds.name)
        print("Query:", recent_query.name, "(id={})".format(recent_query.id))
        print("Query:", severity_query.name, "(id={})".format(severity_query.id))
        print("Query:", trend_query.name, "(id={})".format(trend_query.id))
        print("Query:", source_query.name, "(id={})".format(source_query.id))
        print("Query:", kpi_query.name, "(id={})".format(kpi_query.id))
        print("Dashboard:", overview_dashboard.name, "(id={})".format(overview_dashboard.id))
        print("Dashboard:", triage_dashboard.name, "(id={})".format(triage_dashboard.id))
        print("Dashboard:", executive_dashboard.name, "(id={})".format(executive_dashboard.id))


if __name__ == "__main__":
    main()
