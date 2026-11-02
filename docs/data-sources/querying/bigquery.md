---
title: BigQuery
---

### Data Source Setup Screen

On the BigQuery Data Source setup screen, the **Project ID** and **JSON Key File** are always required. You can get a key file when you create a new service account with Google (details below).

![](/assets/images/docs/gitbook/bigquery_mandatories.PNG)

- If your database schema exceeds 5000 tokens, untick the **Load Schema** box to stop Redash from loading it to the Query Editor screen. Many browsers will slow down or crash if the schema is too big.

- Since BigQuery 2.0, BigQuery supports its Legacy SQL syntax or [Standard SQL Syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/migrating-from-legacy-sql). Redash supports both, but Standard SQL is the default. This preference applies at the Data Source-level by toggling the **Use Standard SQL** box. Your selection here is passed to BigQuery along with your query text. If some of your queries use Legacy SQL and others use Standard SQL, you can create two data sources.

- You can read more about **Processing Location** [here](https://cloud.google.com/bigquery/docs/locations). If you receive a job not found error that looks like this: `Not found: Job <project_id>:<job_id>`, check that your Processing Location is correct.

- If you enter a **Scanned Data Limit**, Redash will perform a dry-run when you execute your query to check how much data will be processed. And if it is larger than the limit you specify, an error will appear.

- The **Maximum Billing Tier** is an integer number that Redash can pass along to BigQuery via their API. See [their documentation](https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#jobconfigurationquery) for more info.

### How to create a Google Service Account?

1. Open the [API Credentials Page](https://console.cloud.google.com/apis/credentials). If prompted, select or create a project.
2. Click the "Create credentials" button. On the dropdown that appears, chose "Service account key".
3. On the following page, use the dropdown to select the project you elected in step 1. For role select `BigQuery Admin` from the tree menu.
4. Under key type, select JSON and hit "Create"

A `.json` file will then download to your computer. Use this when setting up your Data Source.

### BigQuery Permissions and Roles

If you’re using the predefined roles in BigQuery, you need to use the admin
role since it's the only one that can create queries and list tables.

Want to create your own role? The permissions you need to assign are:

- bigquery.jobs.create
- bigquery.jobs.get
- bigquery.jobs.update
- bigquery.datasets.get
- bigquery.tables.list
- bigquery.tables.get
- bigquery.tables.getData

###
