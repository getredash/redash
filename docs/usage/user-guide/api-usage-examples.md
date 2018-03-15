---
categories:
- integrations-and-api
collection: user-guide
helpscout_url: https://help.redash.io/article/162-api-usage-examples
keywords: null
name: API Usage Examples
slug: api-usage-examples
---
Below you can find a few example scripts that use our API for various tasks:

### Export All Your Queries as Files

<https://gist.github.com/arikfr/598590356c4da18be976>

Given an API key, it will export all the account queries as simple files on
your file system. Can be useful for backups or to sync a git repository.

### Poll for Fresh Query Results (including parameters)

<https://gist.github.com/arikfr/e3e434d8cfd7f331d499ccf351abbff9>

This example uses the refresh API to make Redash refresh a query to make sure
you get fresh results and then poll the API until a result is ready. Can be
used for queries with or without parameters.

