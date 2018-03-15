---
categories:
- querying
collection: user-guide
helpscout_url: https://help.redash.io/article/25-writing-queries
keywords: null
name: Creating and Editing Queries
slug: writing-queries
---
To start working on a new query, click "New Query" on the home page or under
the Queries menu in the navigation bar.

[![](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a57bbbc042863193800e753
/file-
rzKFwqy8SP.gif)](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a57bbbc042863193800e753
/file-rzKFwqy8SP.gif)

###  Publish/Unpublish

By default each query starts in a draft state (Unpublished), which means that:

  * Only the user who created this query can see it in the "All Queries" list or in search results.
  * You can't add visualizations from an unpublished query to dashboards or use it in alerts.

To publish a query you can simply give it a name or click the "Publish"
button. It's also possible to unpublish a published query by clicking on the
"Unpublish" button in the query menu.

### Query Syntax

In most cases we use the data sources native query language. In some cases
there are differences or additions, which are documented in the [Querying Data
Sources category](http://help.redash.io/category/102-querying).

### Schema Browser and Autocomplete

To the left of the query editor, you will find the Schema Browser:

![](http://d33v4339jhl8k0.cloudfront.net/docs/assets/5877897f90336009736c5d9b/images/5a42799e0428631938004ad7
/file-qJlSAp0sl0.png)

The schema browser will list all your tables, and when clicking on a table
will show its columns. You can filter the schema with the search box and
refresh it by clicking on the refresh button (otherwise it refreshes
periodically in the background).

Please note that not all data source types support loading the schema.

Beside the schema browser, Redash supports autocomplete while typing your
query. The autocomplete is auto triggered, unless you have a large schema
(>5000 tokens - tables and columns). In case of a large schema, the
autocomplete can be manually triggered with `Ctrl` \+ `Space`.

### Keyboard Shorcuts

  * Execute query: `Ctrl`/`Cmd` + `Enter`
  * Save query: `Ctrl`/`Cmd` + `S`

## Additional Query Actions

### Archiving a Query

Once a query is no longer useful, you can archive it. Archiving is almost the
same as deleting, except that direct links to the query will still work. To
archive a query, open the little menu at the top-right area of the query
editor, next to the Save button and click Archive.

![archive_query.png](https://github.com/getredash/website/blob/master/user-
guide/assets/archive_query.png?raw=true)

### Duplicating (Forking) a Query

If you need to create a copy of an existing query (created by you or someone
else), you can fork it. To fork a query, just click on the Fork button (see
example below)

[![](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a57c0f92c7d3a1943682776
/file-
GtsnSfIBTe.gif)](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a57c0f92c7d3a1943682776
/file-GtsnSfIBTe.gif)

