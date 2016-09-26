JIRA (JQL): Querying
#################

*Simple query, just return issues with no filtering:*

.. code:: json

    {
    }

*Return only specific fields:*

.. code:: json

    {
        "fields": "summary,priority"
    }

*Return only specific fields and filter by priority:*

.. code:: json

    {
        "fields": "summary,priority",
        "jql": "priority=medium"
    }

*Count number of issues with `priority=medium`:*

.. code:: json

    {
        "queryType": "count",
        "jql": "priority=medium"
    }
