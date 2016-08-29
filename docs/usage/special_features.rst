Special Features
#################

Re:dash has a lot of very useful features and most of them can be found easily when using the UI. This page features the less well-known ones.

Queries
========
It is possible to have filters for query results and visualizations. Thanks to filters, you can restrain the result to a certain or multiple values. Filters are enabled by following a naming convention for columns.

If you want to focus only on a specific value, you will need to alias your column to ``<columnName>::filter``. Here is an example:

.. code:: sql

    select action as "action::filter", count (0) as "actions count"
    from events
    group by action

You can see this query and the rendered UI `here <http://demo.redash.io/queries/143/source#table>`_.

If you are interested in multi filters (meaning that you can select multiple values), you will need to alias your column to ``<columnName>::multi-filter``. Here is an example:

.. code:: sql

    select action as "action::multi-filter", count (0) as "actions count"
    from events
    group by action

You can see this query and the rendered UI `here <http://demo.redash.io/queries/144/source#table>`_.

Note that you can use ``__filter`` or ``__multiFilter``, (without double quotes) if your database doesn't support ``::`` in column names (such as BigQuery).

Dashboards
==========
It is possible to group multiple dashboards in the dashboards menu. To do this, you need to follow a naming convention by using a column (``:``) to separate the dashboard group and the actual dashboard name. For example, if you name 2 dashboards ``Foo: Bar`` and ``Foo: Baz``, they will be grouped under the ``Foo`` namespace in the dropdown menu.

If you've got queries that have some filters and you want to apply filters at the dashboard level (that apply to all queries), you need to set a flag. You can do it through the admin interface at ``/admin/dashboard`` or manually by setting the column ``dashboard_filters_enabled`` of the table ``dashboards`` to ``TRUE`` in the Re:dash database.

Exporting query results to CSV or JSON
======================================
Query results can be automatically exported to CSV or JSON by using your API key. Your API key can be found when viewing your profile, from the top right menu in the navigation bar.

The format of the URL is the following: ``https://<redash_domain>/api/queries/<query_id>/results.(csv|json)?api_key=<your_api_key>``. Here is a working example: `<http://demo.redash.io/api/queries/63/results.json?api_key=874fcd93ce4b6ef87a9aad41c712bcd5d17cdc8f>`_.

Using this URL you can easily import query results directly into Google Spreadsheets, using the ``importdata`` function. For example: ``=importdata("...")``.
