---
title: Anonymous Usage Data Sharing (Optional)
---

Starting from Redash version `8-beta.2` we will give you an option to share anonymous aggregated
usage data when Redash does a version check. This is opt-in, but we encourage you to join as it
helps us better direct future product efforts.

The information we will be sending is:

- Number of users, queries, dashboards, alerts, widgets and visualizations.
- Types of data sources, alert destinations and visualizations.

An example JSON payload that is being sent to us:

```
{
    "current_version": "8-beta.2",
    "usage": {
        "users_count": 1,
        "queries_count": 4,
        "dashboards_count": 1,
        "widgets_count": 1,
        "textbox_count": 0,
        "alerts_count": 0,
        "data_sources": {
            "pg": 1,
            "redshift": 1
        },
        "visualization_types": {
            "TABLE": 4,
            "COUNTER": 5
        },
        "destination_types": {
            'slack': 1,
            'webhook': 2
        }
    }
}
```
