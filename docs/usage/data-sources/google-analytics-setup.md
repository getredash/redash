---
categories:
- setup
collection: data-sources
helpscout_url: https://help.redash.io/article/125-google-analytics-setup
keywords: null
name: Google Analytics Setup
slug: google-analytics-setup
---
Create a Service Account

1

    Open the [Service accounts page](https://console.developers.google.com/permissions/serviceaccounts). If prompted, select a project. 
2

    Click Create service account. 
3

    In the Create service account window, type a name for the service account, and select Furnish a new private key. When prompted, select JSON key file type. Then click Create.

Your new public/private key pair is generated and downloaded to your machine;
it serves as the only copy of this key. You are responsible for storing it
securely.

### Enable the API

You will need to enable "Analytics API" for your Google Cloud project.

### Add service account to the Google Analytics account

The newly created service account will have an email address that looks
similar to: quickstart@PROJECT-ID.iam.gserviceaccount.com Use this email
address to  [add a user](https://support.google.com/analytics/answer/1009702)
to the Google analytics view you want to access via the API. For Redash only
[Read & Analyze](https://support.google.com/analytics/answer/2884495)
permissions are needed.

### Create Datasource in Redash

Create the data source "Google Analytics" with the JSON file generated in the
"Create a Service Account" step.

### Example Queries

    
    
    {
    	"ids": "ga:97038718",
    	"start_date": "30daysAgo",
    	"end_date": "yesterday",
    	"metrics": "ga:newUsers",
    	"dimensions": "ga:country",
    	"max_results": 10,
    	"sort": "-ga:newUsers"
    }
    
    
    
    {
    	"ids": "ga:97038718",
    	"start_date": "30daysAgo",
    	"end_date": "yesterday",
    	"metrics": "ga:newUsers",
    	"dimensions": "ga:date",
    	"sort": "-ga:newUsers"
    }
    

You can get an idea of possible field types and dimensions using the  [Query
Explorer tool](https://ga-dev-tools.appspot.com/query-explorer/).

To apply further manipulation on the data set you get from querying Google
Analytics you can use the Query Results data source, read more
[here](https://redash.io/help/queries/using-datasets-as-data-sources.html)

