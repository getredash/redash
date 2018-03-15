---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/118-querying-urls
keywords: null
name: Querying URLs
slug: querying-urls
---
Using a URL based data source requires that the URL return the [ _results JSON
format_](https://redash.io/help-onpremise/how-rd-works/data-source-results-
format.html)

The query itself inside Redash will simply contain the URL to be executed
(i.e.   <http://myserver/path/myquery>) and result with all the data it has -
the SQL equivalent would be `SELECT * FROM url`.

Here's a list of valid column types returned in results:

  * integer
  * float
  * boolean
  * string
  * datetime
  * date

To manipulate the data you get from your URL data source you can save the
query that resulted in all the data and query that data set. Read more about
querying query results  [here](http://help.redash.io/article/152-using-query-
results-as-data-sources).

