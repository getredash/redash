Data Source Results Format
==========================

All data sources in re:dash return the following results in JSON format:

.. code:: javascript

    {
        "columns" : [
            {
               // Required: a unique identifier of the column name in this result
               "name" : "COLUMN_NAME",
               // Required: friendly name of the column that will appear in the results
               "friendly_name" : "FRIENDLY_NAME",
               // Optional: If not specified sort might not work well.
               // Supported types: integer, float, boolean, string (default), datetime (ISO-8601 text format)
               "type" : "VALUE_TYPE"
            },
            ...
        ],
        "rows" : [
            {
                // name is the column name as it appears in the columns above.
                // VALUE is a valid JSON value. For dates its an ISO-8601 string.
                "name" : VALUE,
                "name2" : VALUE2
            },
            ...
        ]
    }
