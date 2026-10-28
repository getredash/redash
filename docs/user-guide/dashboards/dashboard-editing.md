---
title: Creating and Editing Dashboards
---

## Creating a Dashboard

A dashboard lets you combine visualizations and text boxes that provide context with your data.

![](/assets/images/docs/gifs/dashboards/dashboards.gif)

You can create a new dashboard with the **Create** button from the main navigation menu:

![](/assets/images/docs/gitbook/create-dashboard.png)

After naming your dashboard, you can add widgets from existing query visualizations or by writing commentary with a text box. Start by clicking the **Add Widget** button.

![](/assets/images/docs/gitbook/add-widgets-to-dashboard.png)

Search existing queries or pick a recent one from the pre-populated list:

![](/assets/images/docs/gitbook/add-widgets-modal.png)

### Dashboard URLs

When you create a dashboard, Redash automatically assigns it an `id` number and a URL `slug`. The slug is based on the name of the dashboard. For example a dashboard named "Account Overview" could have this URL:

`https://redash.app/dashboards/251-account-overview`

If you change the dashboard name to "Account Over (Old)", the URL will update to:

`https://redash.app/dashboards/251-account-overview-old-`

The dashboard can also be reached using the `/dashboard` endpoint (notice this is singular), which accepts _either_ an ID or a slug:

- `https://redash.app/dashboard/251`
- `https://redash.app/dashboard/account-overview`

Dashboard ids are guaranteed to be unique. But multiple dashboards may use the same name (and therefore `slug`). If a user visits `/dashboard/account-overview` and more than one dashboard exists with that slug, they will be redirected to the earliest created dashboard with that slug.

## Picking Visualizations

By default, query results are shown in a table. At the moment it's not possible to create a new visualization from the "Add Widget" menu, so you'll need to open the query and add the visualization there beforehand ([instructions](/help/user-guide/visualizations/visualizations-how-to/)).

## Adding Text Boxes

Add a text box to your dashboard using the `Text Box` tab on the **Add Widget** dialog. You can style the text boxes in your dashboards using [Markdown](https://daringfireball.net/projects/markdown/syntax).

:::note

You can include static images on your dashboards within your markdown-formatted text boxes. Just use markdown image syntax:`![]( <url for image > )`

:::

## Dashboard Filters

When queries have filters you need to apply filters at the dashboard level as well. Setting your dashboard filters flag will cause the filter to be applied to all Queries.

1\. Open dashboard settings:

<img src="/assets/images/docs/gitbook/edit-dashboard.png" width="60%">

2\. Check the "Use Dashboard Level Filters" checkbox:

![](/assets/images/docs/gitbook/dashboard-filter.png)

## Managing Dashboard Permissions

By default, dashboards can only be modified by the user who created them and members of the Admin group. But Redash includes experimental support to share edit permissions with non-Admin users. An Admin in your organization needs to enable it first. Open your organization settings and check the "Enable experimental multiple owners support"

![](/assets/images/docs/gitbook/experimental-owners-support.png)

Now the Dashboard options menu includes a `Manage Permissions` option. Clicking on it it will open a dialog where you can add other users as editors to your dashboard.

![](/assets/images/docs/gitbook/experimental-permissions-button.png)

Please note that currently the users you add won't receive a notification, so you will need to notify them manually.

## Dashboard Refresh

Even large dashboards should load quickly because they fetch their data from a cache that renews whenever a query runs. But if you haven't run the queries recently, your dashboard might be stale. It could even mix old data with new if some queries ran more recently than others.

To force a refresh, click the Refresh button on the upper-right of the dashboard editor. This runs all the dashboard queries and updates its visualizations.

If you want this to happen periodically you can activate Automatic Dashboard Refresh from the UI by clicking the dropdown pictured below. Or you can pass a `refresh` query string variable with your dashboard URL. **The allowed refresh intervals are expressed in seconds**: 60, 300, 600, 1800, 3600, 43200, and 86400.

![](/assets/images/docs/gitbook/dashboard-refresh.png)

:::note

Automatic Dashboard Refresh occurs as part of the Redash frontend application. Your refresh schedule is only in-effect as long as a logged-in user has the dashboard open in their browser. To guarantee that your queries are executed regularly (which is important for alerts), you should use a [Scheduled Query](/help/user-guide/querying/scheduling-a-query/) instead.

:::

On public dashboards there is no Refresh button. You can add `refresh` to the query string. And for dashboards with parameters you can trigger a refresh by changing a parameter value and clicking **Apply Changes**.

![](/assets/images/docs/gitbook/public-dashboard-refresh.png)
