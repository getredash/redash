---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/117-querying-goog
keywords: null
name: Querying Google Analytics
slug: querying-goog
---
To load your spreadsheet in Redash share your ID with your Service Account’s
email (it can be found in the credentials JSON file, for example,
43242343247-fjdfakljr3r2@developer.gserviceaccount.com).

### Create a Service Account

1

    Open the [Service accounts page](https://console.developers.google.com/permissions/serviceaccounts). If prompted, select a project. 
2

    Click Create service account. 
3

    In the Create service account window, type a name for the service account, and select Furnish a New Private Key. When prompted, select JSON key file type. Then click Create.

The query format is “DOC_UUID|SHEET_NUM” (for example
“kjsdfhkjh4rsEFSDFEWR232jkddsfh|0”) - this will be the equivalent of SELECT *
FROM db type of query and will show you the entire table.

To apply some manipulation on top of the data, you have two options:

1

    Use the "Query Results" data source and your query id as a table (SELECT ..... FROM query_123), then you'll need to query it with SQLite syntax. Read more about query results as data sources [here](http://help.redash.io/article/152-using-query-results-as-data-sources). 
2

    Create a new Google BigQuery table using the Google Spreadsheet in question as a source, and then use Redash’s BigQuery connector to query the spreadsheet indirectly. This way, the SQL used to query the spreadsheet (via BigQuery table) is far more flexible than the direct query of the type (“kjsdfhkjh4rsEFSDFEWR232jkddsfh|0”) mentioned above. ([BigQuery integrates with Google Drive](https://cloud.google.com/blog/big-data/2016/05/bigquery-integrates-with-google-drive)). \

Don't forget to make sure you've shared the spreadsheet with the email address
assigned to the service account you created.

Please Note: If your organization has restrictions on sharing spreadsheets
with external accounts, it might not work, but worth a try - especially if you
created the service account with a Google account from the same organization.

