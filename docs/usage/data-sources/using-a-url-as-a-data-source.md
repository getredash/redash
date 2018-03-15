---
categories:
- setup
collection: data-sources
helpscout_url: https://help.redash.io/article/120-using-a-url-as-a-data-source
keywords: null
name: Using A URL As A Data Source
slug: using-a-url-as-a-data-source
---
The current URL  as a data source is very straightforward -- you give it a URL
and it loads it.

You can also load a JSON file from a URL to use as a data source but you
should know that it has two limitations:

1

    It needs to be in our [specific format](https://redash.io/help-onpremise/how-rd-works/data-source-results-format.html). 
2

    There is a limit on the data size (probably tens of thousands of rows).

Have you considered using either Amazon Athena or Google BigQuery to query
this JSON file? (both are supported in Redash)

As for the dashboard -- you can create two dashboards when is the aggregated
one and one is the specific one, which will use a parameter for the site it
shows data for.

