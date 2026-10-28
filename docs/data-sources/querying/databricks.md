---
title: Databricks
---

## Setup

Redash can connect to both Databricks clusters and SQL Endpoints. Consult the [Databricks Documentation](https://docs.databricks.com/integrations/bi/jdbc-odbc-bi.html#get-server-hostname-port-http-path-and-jdbc-url) for how to obtain the **Host**, **HTTP Path**, and an **Access Token** for your endpoint.

![Databricks Data Source Setup Screen](/assets/images/docs/databricks-setup-screen.png)

### Schema Browser

The Databricks query runner uses a custom built schema browser which allows you to switch between databases on the endpoint and see column types for each field.

![Databricks Data Source Setup Screen](/assets/images/docs/databricks-schema-browser.png)

Unlike other query runners, the Databricks schema browser fetches table and column names on-demand as you navigate from one database to another. If you mostly use one database this will be fine.

But if you explore the schema across multiple databases you may experience delays as each database is fetched separately.

Schemas are cached for one hour. You may wish to schedule a hourly job to warm those caches.

You can do this with any REST API tool as follows:

```bash
curl --request GET \
  --url http://<redash host>/api/databricks/databases/<data-source-id>/<database-name>/tables?refresh \
  --header 'Authorization: Key <admin-api-key>' \
```

### Auto Limit

The Databricks query runner also includes a checkbox beneath the query editor which will append a `LIMIT 1000` statement to your query automatically by default. This helps in case you accidentally run `SELECT * FROM` some large table with enough results to crash the front-end.

### Multiple Statement Support

The Databricks query runner allows you to execute multiple statements terminated with a semicolon `;` in one query window.

:::note

Only one table of query results can be displayed from a query.

:::

This is useful for setting session / cluster configuration variables prior to executing the query on your cluster.

```sql
set use_cached_result = False;

SELECT count(*) FROM some_db.some_table
```
