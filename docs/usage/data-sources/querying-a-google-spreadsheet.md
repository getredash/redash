---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/114-querying-a-google-spreadsheet
keywords: null
name: Querying a Google Spreadsheet
slug: querying-a-google-spreadsheet
---
## Setup

To setup a Google Spreadsheets data source you need to create a **Service
Account** , when creating a Service Account, you will be provided with a JSON
key file -- you upload this file when setting up the data source. ****

### How to create a Google Service Account?

1

    Open the [Service accounts page](https://console.developers.google.com/permissions/serviceaccounts). If prompted, select a project. 
2

    Click "Create Service Account" at the top of the page.
3

    In the Create service account window, type a name for the Service Account, and select "Furnish a New Private Key". When prompted, select  **JSON key file** type. Then click  Create.

## Querying

Once you have setup the data source, you can load spreadsheets into Redash. To
do so, you need to share the spreadsheet with the Service Account's ID -- this
can be seen in the  [Service accounts
page](https://console.developers.google.com/permissions/serviceaccounts) or in
the JSON file (sharing is done like you would share with any regular user).

After the spreadsheet is shared, you create a new query in Redash, select the
data source you created and in the query text enter the Spreadsheet ID and
(optionally) sheet number, separated by a vertical bar symbol (|). For
example: `1DFuuOMFzNoFQ5EJ2JE2zB79-0uR5zVKvc0EikmvnDgk|0` to load the first
sheet or `1DFuuOMFzNoFQ5EJ2JE2zB79-0uR5zVKvc0EikmvnDgk|1` to load the second.

**What is the Spreadsheet ID?**

You can find the Spreadsheet ID in the spreadsheet URL. So for example, if the
spreadsheet URL is:  
<https://docs.google.com/spreadsheets/d/1DFuuOMFzNoFQ5EJ2JE2zB79-0uR5zVKvc0EikmvnDgk/edit#gid=0>

Then the id will be   `1DFuuOMFzNoFQ5EJ2JE2zB79-0uR5zVKvc0EikmvnDgk`.

If your organization has restrictions on sharing spreadsheets with external
accounts, it might not work, but worth a try - especially if you created the
service account with a Google account from the same organization.

### Filtering The Data

When you load a spreadsheet into Redash, we load it in full. If you want to
filter some data or aggregate it, you can use one of the following methods:

  * Use the ["Query Results" data source](http://help.redash.io/article/152-using-query-results-as-data-sources), which allows you to run queries on top of existing queries.
  * Use [Google BigQuery's integration with Google Drive](https://cloud.google.com/blog/big-data/2016/05/bigquery-integrates-with-google-drive) to create a Google BigQuery external table based on the Google Spreadsheet.

