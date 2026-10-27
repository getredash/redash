---
title: API
---

## API Authentication

All the API calls support authentication with an API key. Redash has two types
of API keys:

- User API Key: has the same permissions as the user who owns it. Can be found on a user profile page.
- Query API Key: has access only to the query and its results. Can be found on the query page.

Whenever possible we recommend using a Query API key.

## Accessing with Python

We provide a light wrapper around the Redash API called `redash-toolbelt`. It's a work-in-progress. The source code is hosted on [Github](https://github.com/getredash/redash-toolbelt). The `examples` folder in that repo includes useful demos, such as:

- [Poll for Fresh Query Results (including parameters)](https://github.com/getredash/redash-toolbelt/blob/master/redash_toolbelt/examples/refresh_query.py)
- [Refresh an entire Dashboard](https://github.com/getredash/redash-toolbelt/blob/master/redash_toolbelt/examples/refresh_dashboard.py)
- [Export all your queries as files](https://github.com/getredash/redash-toolbelt/blob/master/redash_toolbelt/examples/query_export.py)

## Common Endpoints

:::danger

Below is an incomplete list of Redash's API endpoints as of V9. These may change in future versions of Redash.

:::

Each endpoint is appended to your Redash base URL. For example:

- `https://app.redash.io/<slug>`
- `https://redash.example.com`

### Queries

`/api/queries`

- GET: Returns a paginated array of query objects.
  - Includes the most recent `query_result_id` for non-parameterized queries.
- POST: Create a new query object

`/api/queries/<id>`

- GET: Returns an individual query object
- POST: Edit an existing query object.
- DELETE: Archive this query.

`/api/queries/<id>/results`

- GET: Get a cached result for this query ID. - Only works for non parameterized queries. If you attempt to GET results
  for a parameterized query you'll receive the error: `no cached result found
for this query`. See POST instructions for this endpoint to get results for
  parameterized queries.

- POST: Initiates a new query execution or returns a cached result. - The API prefers to return a cached result. If a cached result is not
  available then a new execution job begins and the job object is returned. To
  bypass a stale cache, include a `max_age` key which is an integer number of
  seconds. If the cached result is older than `max_age`, the cache is ignored
  and a new execution begins. If you set `max_age` to `0` this guarantees a new
  execution. - If passing parameters, they must be included in the JSON request body as
  a `parameters` object.

:::note

Here's an example JSON object including different parameter types:

```
{
  "parameters": {
    "number_param": 100,
    "date_param": "2020-01-01",
    "date_range_param": {
      "start": "2020-01-01",
      "end": "2020-12-31"
    }
  },
  "max_age": 1800
}
```

:::

### Jobs

`/api/jobs/<job_id>`

- GET: Returns a query task result (job)
  - Possible statuses:
    - 1 == PENDING (waiting to be executed)
    - 2 == STARTED (executing)
    - 3 == SUCCESS
    - 4 == FAILURE
    - 5 == CANCELLED
  - When status is success, the job will include a `query_result_id`

### Query Results

`/api/query_results/<query_result_id>`

- GET: Returns a query result
  - Appending a filetype of `.csv` or `.json` to this request will return a downloadable file. If you append your `api_key` in the query string, this link will work for non-logged-in users.

### Dashboards

`/api/dashboards`

- GET: Returns a paginated array of dashboard objects.
- POST: Create a new dashboard object

`/api/dashboards/<dashboard_slug>`

- GET: Returns an individual dashboard object.
- DELETE: Archive this dashboard

`/api/dashboards/<dashboard_id>`

- POST: Edit an existing dashboard object.
