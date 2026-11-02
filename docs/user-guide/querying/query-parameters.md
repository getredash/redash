---
title: Query Parameters
keywords:
  - variable
  - variables
  - template
sidebar:
  order: 3
---

<iframe width="560" height="315" src="https://www.youtube.com/embed/02iQXd2Ouos" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

With parameters you can substitute values into your query at runtime without having to **Edit Source**. Any string between double curly braces `{{ }}` will be treated like a parameter. A widget will appear above the results pane so you change the parameter value.

<img src="/assets/images/docs/gitbook/parameter-example.png">

In editing mode, you can click the gear icon for each parameter widget to adjust its settings. The gear icons disappear when you click **Show Data Only** so that users who don't own the query can't change the parameter behavior.

<img src="/assets/images/docs/gitbook/query-parameter-widgets.png">

## Add A Parameter From The UI

You can insert a parameter into your query and immediately activate its settings pane by using the `Add Parameter` button or associated keyboard shortcut. The parameter will be inserted wherever the text caret appears in your query. If you find that you've inserted the parameter in the wrong part of the query, you can select the entire parameter (including the curly braces!) and cut/paste it wherever necessary.

:::note

You can discover the key shortcut on your operating system by hovering your cursor above the `Add Parameter` button.

:::

### Parameter Settings

Click the gear icon beside each parameter widget to edit its settings:

- **Title** : by default the parameter title will be the same as the keyword in the query text. If you want to give it a friendlier name, you can change it here.
- **Type** : each parameter starts as a Text type. Supported types are Text, Number, Date, Date and Time, Date and Time (with Seconds), and Dropdown List.

<img src="/assets/images/docs/gitbook/parameter-modal-v9.png" >

:::note

Prior to Redash version 7, the parameter settings pane in the Query Editor included a `Global` tickbox, which notified Redash that you intended to use this parameter across multiple widgets in a dashboard. The `Global` tickbox has been replaced since version 6 with the new _Parameter Mapping on Dashboards_ functionality described below.

:::

:::danger

For security reasons, a Redash user must have [Full Access](/help/user-guide/users/permissions-groups/) permission to the data source to use Text-type Query Parameters. Other types such as Date, Date Range, Number or Dropdown list are available to all users.

:::

### Date and Date-Range Parameters

Date Parameters use a familiar calendar picking interface and can default to the current date and time. You can chose from three levels of precision: Date, Date and Time, and Date and Time with seconds.

Date Range Parameters insert two markers called `.start` and `.end` which signify the beginning and end of your chosen date range.

```
SELECT a, b c
FROM table1
WHERE
  relevant_date >= '{{ myDate.start }}'
  AND table1.relevant_date <= '{{ myDate.end }}'
```

:::note

Date parameters are passed as strings to your database. So you should wrap them in single quotes (`'`) or whatever your database uses to declare strings. Although they behave like Text parameters Dates are still safe for use in embeds and share dashboards.

:::

Date Range parameters use a combined widget to simplify range selection.

![](/assets/images/docs/gitbook/date-range-picker.png)

#### Quick Date and Date-Range Options

When you add a Date or Date Range parameter to your query, the selection widget shows a blue lightning bolt glyph. Click the glyph to see dynamic values like "Today" or "Yesterday".

There are dynamic date range options too. The complete list of dynamic date-ranges is:

- This week
- This month
- This year
- Last week
- Last month
- Last year
- Last 7 days
- Last 14 days
- Last 30 days
- Last 60 days
- Last 90 days
- Last 12 months

:::caution

Because dynamic dates and date ranges are calculated in the front-end, they aren't compatible with Scheduled Queries.

:::

### Dropdown Lists

If you want to restrict the scope of possible parameter values when running a query, you can use Redash's `Dropdown List` parameter type. When selected from the parameter settings panel, a text box appears where you can enter your allowed values, each one separated by a new line. Dropdown lists are `Text` parameters under the hood, so if you want to use dates/datetimes in your dropdown, you should enter them in the format your data source requires.

#### Query Based Dropdown List

Dropdown lists can also be tied to the results of an existing query. Just click `Query Based Dropdown List` under **Type** in the settings panel. Search for your target query in the **Query to load dropdown values from** bar. Performance will degrade if your target query returns a large number of records.

If your target query returns more than one column, Redash uses the _first_ one. If your target query returns `name` and `value` columns, Redash populates the parameter selection widget with the `name` column but executes the query with the associated `value`.

For example, suppose this query:

```sql
SELECT user_uuid as 'value', username as 'name'
FROM users
```

returned this data:

| value | name         |
| ----- | ------------ |
| 1001  | John Smith   |
| 1002  | Jane Doe     |
| 1003  | Bobby Tables |

Redash's dropdown list widget would look like this:

<img src="/assets/images/docs/gitbook/dropdown-list-name-value.png"  alt="The widget shows John Smith, Jane Doe and Bobby Tables">

But when Redash executes the query, the value passed to the database would be 1001, 1002 or 1003.

#### Serialized Multi-Select

Dropdown lists can also be serialized to allow for multi-select. Just toggle the **Allow multiple values** option and choose whether or not to wrap the parameters with single quotes or double-quotes.

<img src="/assets/images/docs/gitbook/multi-select-dropdown.png">

In your query, change your `WHERE` clause to use the `IN` keyword.

```
SELECT ...
FROM   ...
WHERE field IN ( {{ Multi Select Parameter }} )
```

The parameter multi-selection widget let you pass extra values to the database.

<img src="/assets/images/docs/gitbook/multi-select.png" >

### FAQ

**Can I reuse the same parameter multiple times in a single query?**

Sure! Just use the same identifier in the curly brackets. In this example:

```sql
SELECT {{org_id}}, count(0)
FROM queries
WHERE org_id = {{org_id}}
```

We use the `{{org_id}}` parameter twice.

**Can I use multiple parameters in a single query?**

Of course, just use a unique name for each one. In this example:

```sql
SELECT count(0)
FROM queries
WHERE org_id = {{org_id}} AND created_at > '{{start_date}}'
```

We use two parameters: `{{org_id}}` and `{{start_date}}`.

**Can I use parameters in embedded visualizations and shared dashboards?**

Yes, with one exception. If a query uses a Text type parameter it cannot be embedded because Text parameters are not safe from SQL injection. All other types of query parameters can be used safely in embedded visualizations and dashboards.

| Parameter Type                | Safe for Embedding? |
| ----------------------------- | ------------------- |
| Text                          | No                  |
| Number                        | Yes                 |
| Dropdown List                 | Yes                 |
| Query Based Dropdown List     | Yes                 |
| Date                          | Yes                 |
| Date and Time                 | Yes                 |
| Date and Time w/Seconds       | Yes                 |
| Date Range                    | Yes                 |
| Date and Time Range           | Yes                 |
| Date and Time Range w/Seconds | Yes                 |

:::note

Prior to Version 8 of Redash, parameters were not allowed in embedded visualizations. In a future version, all types of parameters will be allowed on publicly shared dashboards and visualizations. Our hosted platform always runs the latest available version of the app.

:::

**Can I change parameter values via the URL?**

Yes. Each parameter appears in the URL query string preceded by `p_`. A query with id `1234` and the following query text:

```
SELECT * FROM table WHERE field = {{param}}
```

Would have link a like so: `https://app.redash.io/<slug>/queries/1234?p_param=100`

This is useful for linking between queries and dashboards.

## Parameter Mapping on Dashboards

Query Parameters can also be powerfully controlled within dashboards. You can link together parameters on different widgets, set static parameter values, or choose values individually for each widget.

You select your desired parameter mapping when adding dashboard widgets that depend on a parameter value. Each parameter in the underlying query will appear in the **Parameters** list.

<img src="/assets/images/docs/gitbook/dashboard_parameter_mapping.png" width="100%">

:::note

You can also access the parameter mapping interface by clicking the vertical ellipsis (`⋮`) on the top right of a dashboard widget then clicking **Edit Parameters**.

:::

- **Title** is the display name for your parameter and will appear beside the value selector on your dashboard. It defaults to the parameter keyword (see next bullet). Edit it by clicking the pencil glyph. Note that a titles are not displayed for static dashboard parameters because the value selector is hidden. If you select `Static value` as your Value Source then the Title field will be grayed out.

- **Keyword** is the string literal for this parameter in the underlying query. This is useful for debugging if your dashboard does not return expected results.

- **Default Value** is what Redash will use if no other value is specified. To change this from the query screen, execute the query with your desired parameter value and click the **Save** button.

- **Value Source** is where you choose your preferred mapping. Click the pencil glyph to open the mapper settings.

### Value Source Options

- **New dashboard parameter:** Dashboard parameters allow you to set a parameter value in one place on your dashboard and map it to multiple visualizations. Use this option to create a new dashboard-level parameter.

- **Existing dashboard parameter:** If you have already set up a dashboard-level parameter, use this option to map it to a specific query parameter. You will need to specify which pre-existing dashboard parameter will be mapped.

- **Widget parameter:** This option will display a value selector inside your dashboard widget. This is useful for one-off parameters that are not shared between widgets.

- **Static value:** Selecting this option will let you choose a static value for this widget, regardless of the values used on other widgets. Statically mapped parameter values do not display a value selector anywhere on the dashboard which is more compact. This lets you take advantage of the flexibility of Query Parameters without cluttering the user interface on a dashboard when certain parameters are not expected to change frequently.
