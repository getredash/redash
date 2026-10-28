---
title: CSV Files (Deprecated)
---

:::caution

The CSV data source used in this tutorial has been replaced. You can find instructions for the new one [here](/help/data-sources/querying/csv-excel-files/). You can still use the deprecated source by manually adding it to your installation. The source code is available under the same license as Redash at [this link](https://gist.github.com/susodapop/d367ff6c02f19ef4b9964e1042ca1d92).

:::

## Intro

You can't upload files to Redash directly. Instead, you have to pull them from
somewhere. This guide shows how to load data from CSV files into Redash and
query it with
[QRDS](/help/user-guide/querying/query-results-data-source/).

<iframe width="560" height="315" src="https://www.youtube.com/embed/qL7hZ-SQmRo?controls=0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Step 1: Configure your data sources

:::danger

If you did this already, go to step 2.

:::

You need two data sources to get started.

1. CSV
2. Query Results

:::note

Only admins can add data sources.

:::

From **Settings** visit the **Data Sources** tab. For each data source click
**New Data Source**. Search for the data source type, click it, and name it.

It is easy to configure both data sources. Just name them (`CSV` and `QR` are
most common) and click **Create**.

:::caution

If you aren't certain, leave the
`HTTP Basic Authentication` options blank on the CSV screen. You will know if
these are required to access your file.

:::

## Step 2: Host your CSV at a public URL

Any host will work if it exposes a raw CSV file through a URL. Most of the
popular file sharing platforms — including Dropbox, Google Sheets, OneDrive, and
Github — show a file preview by default instead of the raw file.

![Screenshot of GitHub CSV preview](/assets/images/docs/gitbook/csv-preview.png)

So you might need to dig a little for the right link.

![Screenshot of raw CSV file in browser](/assets/images/docs/gitbook/raw-csv.png)

Shortcuts for a few common providers appear below.

### Dropbox

![Example of Dropbox Permissions](/assets/images/docs/gitbook/dropbox-share-settings.png)

Generate a share link with permissions set so _Anyone With Link_ can access the
file. The link will look like this:
`https://www.dropbox.com/s/fc5e038d38a570/filename.csv?dl=0`

Change the subdomain from `www` to `dl`. Then change the domain from
`dropbox.com` to `dropboxusercontent.com`

The complete URL is:
`https://dl.dropboxusercontent.com/s/fc5e038d38a570/filename.csv?dl=0`

### Google Drive

![Example of Dropbox Permissions](/assets/images/docs/gitbook/google-share-settings.png)

Generate a share link with permissions set so _Anyone with link can view_ the
file. The link will look like this:
`https://drive.google.com/file/d/fc5e038d38a570/view?usp=sharing`

Copy the file identifier `fc5e038d38a570` and add it to the end of this URL:
`https://drive.google.com/uc?id=`

The complete URL is: `https://drive.google.com/uc?id=fc5e038d38a570`

### OneDrive

![Example of OneDrive Embed Settings](/assets/images/docs/gitbook/onedrive-embed-settings.png)

Generate an HTML embed snippet for your file. Then copy its `src` attribute. The
attribute looks like this:
`https://onedrive.live.com/embed?cid=61905AC1E9907973&resid=61905AC1E9907973%21506&authkey=AFxkxqQH2wePxM8`

Change the word `embed` to `download`.

The complete URL is:
`https://onedrive.live.com/download?cid=61905AC1E9907973&resid=61905AC1E9907973%21506&authkey=AFxkxqQH2wePxM8`

### Github

Right-click the **Raw** button and **Copy Link Location**.

### iCloud Drive

![Example of iCloud Share Settings](/assets/images/docs/gitbook/icloud-share-settings.png)

Generate a share link and copy it to your clipboard. Open a new browser tab and
enable its network inspector. Paste the URL and hit `Enter`.

![Screenshot of network inspector](/assets/images/docs/gitbook/icloud-inspector.png)

The network inspector will show a HTTP `POST` to a URL like this:
`https://ckdatabasews.icloud.com/database/1/com.apple.cloudkit/production/public/records/resolve?`

:::note

The exact subdomain varies but is always prefixed with `ck`
(for CloudKit)

:::

Inspect the JSON response to that request. The raw CSV URL is found at
`results[0].rootRecord.fields.fileContent.value.downloadURL` and looks like
this:

```
https://cvws.icloud-content.com/B/AYifvNUNnayDN0SZAlizP8ZfYUPMAfZEgQW_YFfb6FUKTWO6xVkZo04B/${f}?o=AgSnT48VhMQtC-elFkgjbrw22qBLn3uBOytgkANDgAtv&v=1&x=3&a=CAogw0DCZoo9iGQlDuozkTAtH4vQXNvV5qk9j5g56uwuzaESHRDd_IWOgy4Y3dnhj4MuIgEAUgRfYUPMWgQZo04B&e=1581386329&k=Yc1Tyt4g4oKp6blXKa6yBA&fl=&r=b5089feb-afa2-4d0f-b207-9c9b16524c61-1&ckc=com.apple.clouddocs&ckz=com.apple.CloudDocs&p=24&s=UoT0siK5WgA5WNxN47jHUDlSzQo
```

## Step 3: Pull the data into Redash

![Screenshot of query screen with URL pasted](/assets/images/docs/gitbook/query-example.png)

1. From the top menu click **Create** then **New Query**.
2. Set the data source to CSV data source from step 1.
3. Paste the URL from step 2 into the query editor.
4. Click **Execute**.

:::note

Redash expects a CSV file with a header as the first
row.

:::

The CSV data is now available to Redash. If everything looks correct click
**Save**. Then copy the query ID from the URL bar.

## Step 4: Query the data with QRDS

![Screenshot of QRDS query](/assets/images/docs/gitbook/qrds-query-example.png)

1. From the top menu click **Create** and **New Query**.
2. Set the data source to the Query Results data source from step 1.

There's a complete discussion of QRDS
[elsewhere](/help/user-guide/querying/query-results-data-source/) in
our documentation. A good first query looks like this.

```
SELECT * FROM cached_query_xxxx
```

Just replace `cached_query_xxxx` with the ID of your query from step 3 and click
**Execute**. All the data from your CSV will appear in the results panel.

:::note

It makes sense to used `cached_query` instead of `query`
because the CSV file is unlikely to change. QRDS queries are also faster when a
cached result is used.

:::

Now you can use QRDS to filter, aggregate, and combine the CSV using SQLite
syntax.

<!-- # Troubleshooting

It's rare to see errors once the data is successfully added to Redash in step 3. Most errors occur in step 2.

### My data is jumbled

![Example of jumbled data]()

Your CSV file is not formatted correctly. Common causes are CSV files with unescaped commas. Also confirm that the file is _valid_ CSV. Some systems export "CSV" files that are actually semicolon-delimited.

### I only see one row of data and it's all HTML

![Example of HTML data]()

Your URL from step 2 returns an HTML file instead of a CSV. Follow the instructions for common hosting providers in step 2. Otherwise, find the URL that lets you directly download the CSV file. -->
