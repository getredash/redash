---
title: Query Filters
---

Query Filters let you interactively reduce the amount of data shown in your visualizations, similar to Query Parameters but with a few key differences. Query Filters limit data **after** it has been loaded into your browser. This makes them ideal for smaller datasets and environments where query executions are time-consuming, rate-limited, or costly.

## Usage

Unlike Query Parameters there isn't a button to add a filter. Instead, if you want to focus on a specific value, just alias your column to `<columnName>::filter`. Here's an example:

```
SELECT action AS "action::filter", COUNT(0) AS "actions count"
FROM events
GROUP BY action
```

:::note

Note that you can use `__filter` or `__multiFilter`, (double underscore
instead of double quotes) if your database doesn’t support :: in column names
(such as BigQuery).

:::

![](/assets/images/docs/gitbook/filter_example_action_create.png)

If you need a multi-select filter then alias your column to `<columnName>::multi-filter`.

```
SELECT action AS "action::multi-filter", COUNT (0) AS "actions count"
FROM events
GROUP BY action
```

![](/assets/images/docs/gitbook/multifilter_example.png)

You can use Query Filters on dashboards too. By default, the filter widget will appear beside each visualization where the filter has been added to the query. If you'd like to link together the filter widgets into a dashboard-level Query Filter see [these instructions](/help/user-guide/dashboards/dashboard-editing/).

## Limitations

Query Filters aren't suitable for especially large data sets or query results with hundreds or thousands of distinct field values. Depending on your computer and browser configuration, excessive data can deteriorate the user experience.
