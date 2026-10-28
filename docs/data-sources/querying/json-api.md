---
title: JSON API's
---

Sometimes you need to visualize data not contained in an RDBMS or NOSQL data store, but available from some HTTP API. For those times, Redash provides the `JSON` data source (first introduced in Redash v8).

Redash treats all incoming data from the `JSON` data source as text; so you should be prepared to use [table formatting](/help/user-guide/visualizations/table-visualizations/) when rendering the data.

## JSON Data Source Type

Use the `JSON` Data Source to query arbitrary JSON API's. Setup is easy because no authentication is needed. Any RESTful JSON API will handle authentication through HTTP headers. So just create a new Data Source of type `JSON` and name it whatever you like ("JSON" is a good choice).

Redash will detect data types supported by JSON (like numbers, strings, booleans), but others (mostly date/timestamp) will be treated as strings (unless specified in ISO-8601 format).

### Usage

This Data Source takes queries in [YAML format]. Here's some examples using the GitHub API:

#### Return a list of objects from an endpoint

```yaml
url: https://api.github.com/repos/getredash/redash/issues
```

This will return the result of the above API call as is.

![](/assets/images/docs/gitbook/json_list_of_objects.png)

#### Return a single object

```yaml
url: https://api.github.com/repos/getredash/redash/issues/3495
```

The above API call returns a single object, and this object is being converted to a row.

![Single JSON Object](/assets/images/docs/gitbook/json_single_object.png)

#### Return Specific Fields

In case you want to pick only specific fields from the resulting object(s), you can pass the `fields` option:

```yaml
url: https://api.github.com/repos/getredash/redash/issues
fields: [number, title]
```

![](/assets/images/docs/gitbook/json_field_select.png)

#### Return an inner object

Many JSON API's return arrays of nested objects. You can access an object in an array with the `path` key.

```yaml
url: https://api.github.com/repos/getredash/redash/issues/3495
path: assignees
```

The above query will use the `assignee` objects from the API result as the query result.

#### Pass query string parameters

You can either craft your own URLs, or you can pass the `params` option:

```yaml
url: 'https://api.github.com/search/issues'
params:
  q: is:open type:pr repo:getredash/redash
  sort: created
  order: desc
```

The above is the same as:

```yaml
url: 'https://api.github.com/search/issues?q=+is:open+type:pr+repo:getredash/redash&sort=created&order=desc'
```

#### Additional HTTP Options

You can pass additional keys to modify various HTTP options:

- `method` - the HTTP method to use (default: `get`)
- `headers` - a dictionary of headers to send with the request
- `auth` - basic authentication username/password (should be passed as an array: `[username, password]`)
- `params` - a dictionary of query string parameters to add to the URL
- `data` - a dictionary of values to use as request body
- `json` - same as `data` except that it's being converted to JSON

## URL Data Source Type

:::caution

The `URL` data source type is deprecated since Redash v8. You can still use existing data sources created with this type, but you can't create new ones. We recommend migrating to the JSON data source type.

:::

The `URL` data source expects your endpoints to return JSON with a special data structure (see below).

### Usage

The body of your query will include only the URL that returns data, for example:

```sql
http://myserver/path/myquery
```

To manipulate the data (filter, sort, aggregate etc.) you can use the [Query Results Data Source](/help/user-guide/querying/query-results-data-source/).

### Required Data Structure

The returned object must expose two keys: `columns` and `rows`.

- The `columns` key should expose an array of javascript objects describing the columns to be included in your data set. Each object will include three keys:

  - `name`
  - `type`
  - `friendly_name`

- `rows` should return an array of javascript objects representing each row of data. The keys for each object should match the `name` keys described in your `columns` array.

The following data types are supported for columns:

- text
- integer
- float
- boolean
- string
- datetime
- date

An example of returned data appears below:

```
{
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

[YAML format]: https://www.tutorialspoint.com/yaml/yaml_basics.htm
[JSON format]: https://json.org
