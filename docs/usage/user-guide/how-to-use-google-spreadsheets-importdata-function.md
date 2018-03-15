---
categories:
- integrations-and-api
collection: user-guide
helpscout_url: https://help.redash.io/article/129-how-to-use-google-spreadsheets-importdata-function
keywords: null
name: How To Use Google Spreadsheets IMPORTDATA Function
slug: how-to-use-google-spreadsheets-importdata-function
---
Using the CSV URL of your query results you can easily import query results
directly into **Google Spreadsheets** , using the `IMPORTDATA` function. The
CSV URL along with the API Key, can be found when clicking on the "Show API
Key" button in the query menu:

![](http://d33v4339jhl8k0.cloudfront.net/docs/assets/5877897f90336009736c5d9b/images/5a57c9d5042863193800e83e
/file-M8jjjAEAnm.png)

In the dialog which opens, you will find a CSV URL similar to:
`https://app.redash.io/acme/api/queries/123/results.csv?api_key=secret`, which
you input to the `IMPORTDATA` function:

`=IMPORTDATA("https://app.redash.io/acme/api/queries/123/results.csv?api_key=secret")`

