---
categories:
- getting-started
collection: user-guide
helpscout_url: https://help.redash.io/article/32-getting-started
keywords:
- Add Data Source
- datasource
- datasources
- adding datasource
name: Getting Started
slug: getting-started
---
## Add A Data Source

The first thing you'll want to do is connect at least one [data source
](http://help.redash.io/article/119-supported-data-sources) . You can add a
new data source from the quick link in the navigation bar:

![](https://59005a708ebdd932a2ed5f47--
redashio.netlify.com/assets/images/docs/data_source_quick_link.png)

Or via the Data Source tab in your admin settings:

![](https://59005a708ebdd932a2ed5f47--
redashio.netlify.com/assets/images/docs/add_new_datasource.png)

If you’re using the Hosted Redash service, you'll need to allow access from
the IP address 52.71.84.157 in your database firewall/security groups (unless
it’s publicly available).

We recommend using a user with read-only permissions for the database (
[BigQuery is an exception](http://help.redash.io/article/124-bigquery-setup)).

##

## Write A Query

Once you've connected at least one data source, give it a go and write a query
in our comfy Query Editor!

Click “New Query” on the homepage or under the Queries menu in the navigation
bar. See the   [“Writing Queries” page](http://help.redash.io/article/25
-writing-queries) for detailed instructions on how to write queries.

You might also find it helpful to check out some Query
[Examples](http://help.redash.io/category/109-example-queries)!

![](https://59005a708ebdd932a2ed5f47--
redashio.netlify.com/assets/images/docs/gifs/queries/add_new_query.gif)

##

## Create A Dashboard

Easily combine visualizations and text into thematic dashboards and share them
in minutes. You can add a new dashboard via the Dashboard menu (the bottom
item will be 'New Dashboard') or via the home screen. For more details,
[click here](http://help.redash.io/article/61-creating-a-dashboard).

![](https://59005a708ebdd932a2ed5f47--
redashio.netlify.com/assets/images/docs/gifs/dashboards/dashboards.gif)

##

## Adding Visualizations

Query results (good old tables) are great, but visualizations are even better
at helping us digest complex information. Redash supports  [multiple types of
visualizations](http://help.redash.io/article/58-visualization-types) so you
should find one that suits your needs (let us know if something is missing).

Click the “New Visualization” button just above the results to select the
perfect visualization for your needs.  You can view more detailed instructions
[here](http://help.redash.io/article/56-creating-a-new-visualization).

![](https://59005a708ebdd932a2ed5f47--
redashio.netlify.com/assets/images/docs/gifs/visualization/new_viz.gif)

## Invite Colleagues

Redash is better together.

Admins, to start enjoying the collaborative nature of Redash you'll want to
invite your team!

Users can view team member's queries for inspiration (or debugging ;)), fork
them to create similar queries of their own, view & create dashboards, and
share insights with others in your team via Email, Slack or HipChat.

Users can only be invited by admins - to invite a new user go to
Settings>Users and hit New User:

![](https://lh4.googleusercontent.com/oI5jelwLl2ke9qFzJyckCmBgKlmAiofRLUdR5uBBxzasGLsC-0-AC7TPvOGUnJZbWCVy3ESioGq4C5-7FDovR5m5tX364RrmA9riJ54rU1rMaMAM10supFsDlOvok0F4Ib2gcunJ)

Then, fill in their name and email. They'll get an invite via email and be
required to set up a Redash account.

Users can be added to existing groups - add users to it by typing their name:

![](https://lh4.googleusercontent.com/JeYKlKvqDS_r4q29WkWf-
3URjixdwYnL4jz4QdHnbtdhN2FGEmPxNILR7qWd71wvImxcmJcTuBkjmwXhfzrBkF7Uh65y48E4t6ofacjT06d5a4zpLb52UJNAzfsfuCUJjMz52ioZ)

