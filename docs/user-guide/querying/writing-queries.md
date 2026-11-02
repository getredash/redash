---
title: Creating and Editing Queries
sidebar:
  order: 1
---

To make a new query, click `Create` in the navbar then select `Query`.

![](/assets/images/docs/gifs/queries/add_new_query.gif)

## Query Editor

### Query Syntax

In most cases we use the query language native to the data source. In some cases there are differences or additions, which are documented on the [Querying Data Sources](/help/data-sources/querying/) page.

### Keyboard Shortcuts

- Execute query: `Ctrl`/`Cmd` + `Enter`
- Save query: `Ctrl`/`Cmd` + `S`
- Toggle Auto Complete: `Ctrl` + `Space`
- Toggle Schema Browser `Alt`/`Option` + `D`

### Schema Browser

To the left of the query editor, you will find the Schema Browser:

<img src="/assets/images/docs/gitbook/schema-browser.png" width="60%">

The schema browser will list all your tables, and when clicking on a table will show its columns. To insert an item into your query, simply click the double arrow on the right side. You can filter the schema with the search box and refresh it by clicking on the refresh button (otherwise it refreshes periodically in the background).

:::note

Please note that not all data source types support loading the schema.

:::

You can hide the Schema Browser using the key shortcut or by double-clicking the pane handle on the interface. This can be useful when you want to maximize screen realestate while composing a query.

### Auto Complete

The query editor also includes an Auto Complete feature that makes writing complicated queries easier. Live Auto Complete is on by default. So you will see table and column suggestions as you type. You can disable Live Auto Complete by clicking the lightning bolt icon beneath the query editor. When Live Auto Complete is disabled, you can still activate Auto Complete by hitting `CTRL` + `Space`.

:::note

Live Auto Complete is enabled by default unless your database schema exceeds five thousand tokens (tables or columns). In such cases, you can manually trigger Auto Complete using the keyboard shortcut.

:::

Auto Complete looks for schema tokens, query syntax identifiers (like `SELECT` or `JOIN`) and the titles of [Query Snippets](/help/user-guide/querying/query-snippets/)

## Query Settings

### Published vs Unpublished Queries

By default each query starts as an unpublished draft named **New Query**. It can't be included on dashboards or used with alerts.

To publish a query, change its name or click the `Publish` button. You can toggle the published status by clicking the `Unpublish` button. Unpublishing a query will not remove it from dashboards or alerts. But it will prevent you from adding it to any others.

:::note

Publishing or un-publishing a query does not affect its visibility.
All queries in your organization are visible to all logged-in users.

:::

### Archiving a Query

You can't delete queries in Redash. But you can archive them. Archiving is like deleting, except **direct links to the query still work.** To archive a query, open the vertical ellipsis menu at the top-right of the query editor and click Archive.

![](/assets/images/docs/gitbook/archive_query.png)

### Duplicating (Forking) a Query

If you need to create a copy of an existing query (created by you or someone else), you can fork it. To fork a query, just click on the Fork button (see example below)

![](/assets/images/docs/gifs/queries/fork_query.gif)

### Managing Query Permissions

By default, saved queries can only be modified by the user who created them and members of the Admin group. But Redash includes experimental support to share edit permissions with non-Admin users. An Admin in your organization needs to enable it first. Open your organization settings and check the "Enable experimental multiple owners support"

![](/assets/images/docs/gitbook/experimental-owners-support.png)

Now the Query Editor options menu includes a `Manage Permissions` option. Clicking on it it will open a dialog where you can add other users as editors to your query or dashboard.

![](/assets/images/docs/gitbook/experimental-permissions-button.png)

Please note that currently the users you add won't receive a notification, so you will need to notify them manually.
