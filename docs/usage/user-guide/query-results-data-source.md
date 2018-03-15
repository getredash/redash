---
categories:
- querying
collection: user-guide
helpscout_url: https://help.redash.io/article/152-query-results-data-source
keywords: null
name: Querying Existing Query Results
slug: query-results-data-source
---
The **Query Results**  Data Source allows you to run queries on top of
existing query results, so you can easily merge results or perform any other
kind of "post-processing".

To use it, you need to create a new data source of type "Query Results". Once
you've done this you can use it to write queries like:

    
    
    SELECT a.name, b.count 
    FROM query_123 a 
    JOIN query_456 b ON a.id = b.id
    

When referencing a query as a table in the Query Results query, the table name
is the query ID (the number in the URL) prefixed with _query__. So for
example, a query with the URL
`https://app.redash.io/acme/queries/49588/source` will become `query_49588`
when referenced as a table.

You need to make sure the table name (`query_...`) is on the same line as the
`FROM`/`JOIN` keywords.

Few notes:

  1. When you run a query, we execute the underlying queries as well to make sure you have recent results in case you schedule this query. We might fine-tune this in the future to reduce the number of times we run the same query.
  2. The processing of the data is being done by SQLite in memory - in case of large result sets it might fail due to memory running out.
  3. Access to the data source is governed by the groups it's associated with, like any other data source. When a user runs a query we also check if he has permission to execute queries on the data sources the original queries use. So while a user who has access to this data source will be able to see any query that uses it, he won't be able to execute queries on data sources he doesn't have access to.

