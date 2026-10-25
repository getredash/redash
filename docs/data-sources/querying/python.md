---
title: Python
---

:::caution

**Security warning:** The Python sandbox is not safe, and we do not consider it a security boundary. We do not recommend using the Python data source with untrusted users. This is why the Python data source is disabled by default.

:::

## Setup

The Python query runner lets you run arbitrary Python 3 scripts and visualize the contents of a `result` variable declared in the script. To enable it add this to your environment:

```bash
REDASH_ADDITIONAL_QUERY_RUNNERS: "redash.query_runner.python"
```

Now you can create a Python data source from **Settings > Data Sources**.

- **Modules to import prior to running the script** lets you define which modules that were installed by `pip` on the host server may be import in Redash queries.
- **AdditionalModulesPaths** is a comma-separated list of absolute paths _on the Redash server_ to Python modules that should be available when querying from Redash. This is useful for private modules that are not available from `pip`.
- **AdditionalBuiltins** Redash allows twenty-five of Python's built-in functions by default. You can specify additional built-ins here.

These are the default built-ins: `abs`, `all`, `any`, `bool`, `complex`, `dict`, `divmod`, `enumerate`, `filter`, `float`, `int`, `len`, `list`, `map`, `max`, `min`, `next`, `reversed`, `round`, `set`, `slice`, `sorted`, `str`, `sum`, `tuple`

## Writing Queries

Redash builds the result table by inspecting the final state of your script execution for a variable named `result`.

`result` is a dictionary with two keys: `columns` and `rows`.

- The `columns` key should expose a list of dictionaries describing the columns to be included in your data set. Each dictionary will include three keys:

  - `name`
  - `type`
  - `friendly_name`

- `rows` key should expose a list of dictionaries representing each row of data. The keys for each dictionary should match the `name` keys described in your `columns` dictionary.

The following data types are supported for columns:

- text
- integer
- float
- boolean
- string
- datetime
- date

An example of returned data appears below:

```python
result = {
  "columns": [
    {
      "name": "date",
      "type": "date",
      "friendly_name": "date"
    },
    {
      "name": "day_number",
      "type": "integer",
      "friendly_name": "day_number"
    },
    {
      "name": "value",
      "type": "integer",
      "friendly_name": "value"
    },
    {
      "name": "total",
      "type": "integer",
      "friendly_name": "total"
    }
  ],
  "rows": [
    {
      "value": 40832,
      "total": 53141,
      "day_number": 0,
      "date": "2014-01-30"
    },
    {
      "value": 27296,
      "total": 53141,
      "day_number": 1,
      "date": "2014-01-30"
    },
    {
      "value": 22982,
      "total": 53141,
      "day_number": 2,
      "date": "2014-01-30"
    }
  ]
}

```

If you execute the above snippet in Redash it will return this table:

| date       | day_number | value | total |
| ---------- | ---------- | ----- | ----- |
| 2014-01-30 | 0          | 40832 | 53141 |
| 2014-01-30 | 1          | 27296 | 53141 |
| 2014-01-30 | 2          | 22982 | 53141 |
