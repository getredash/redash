---
categories:
- querying
collection: user-guide
helpscout_url: https://help.redash.io/article/45-query-filters
keywords: null
name: Query Filters
slug: query-filters
---
Redash has filters for query results and visualizations! Thanks to filters,
you can restrain the result to a specific or multiple values. Filters are
enabled by following a naming convention for columns.

If you want to focus on a specific value, you'll need to alias your column to
`<columnName>::filter` . Here's an example:

    
    
    <code>SELECT action AS "action::filter", COUNT (0) AS "actions count" FROM events GROUP BY action
    

You can see this query and the rendered UI here:
<http://demo.redash.io/queries/143/source#table>

![](https://redash.io/help/assets/filter_example_action_create.png)

![](https://redash.io/help/assets/filter_example_action_fork.png)

If you're interested in multi filters (meaning you can select multiple
values), you will need to alias your column to  `<columnName>::multi-filter`.
Here's an example:

    
    
    <code>SELECT action AS "action::multi-filter", COUNT (0) AS "actions count" FROM events GROUP BY action
    

You can see this query and the rendered UI here:
[http://demo.redash.io/queries/144/source#table](http://demo.redash.io/queries/143/source#table)

![](https://redash.io/help/assets/multifilter_example.png)

Note that you can use  `__filter` or `__multiFilter`, (double underscore
instead of double quotes) if your database doesn’t support :: in column names
(such as BigQuery).

