Data Source Results Format
==========================

All data sources in Re:dash return the following results in JSON format:

.. code:: javascript

    {
        "columns" : [
            {
               "name" : "COLUMN_NAME", // Required: a unique identifier of the column name in this result
               
               "friendly_name" : "FRIENDLY_NAME", // Required: friendly name of the column. Currently unused, so can be the same as _name_.
               "type" : "VALUE_TYPE" // // Supported types: integer, float, boolean, string (default), datetime (ISO-8601 text format). If unknown, use "string".
            },
            ...
        ],
        "rows" : [
            {
                // name is the column name as it appears in the columns above.
                // VALUE is a valid JSON value. For dates it's an ISO-8601 string.
                "name" : VALUE,
                "name2" : VALUE2
            },
            ...
        ]
    }
    
Example:

.. code:: javascript

    {
      "columns": [
        {
          "name": "date",
          "type": "date",
          "friendly_name": "date"
        },
        {
          "name": "day_number",
          "type": "integer",
          "friendly_name": "day_number"
        },
        {
          "name": "value",
          "type": "integer",
          "friendly_name": "value"
        },
        {
          "name": "total",
          "type": "integer",
          "friendly_name": "total"
        }
      ],
      "rows": [
        {
          "value": 40832,
          "total": 53141,
          "day_number": 0,
          "date": "2014-01-30"
        },
        {
          "value": 27296,
          "total": 53141,
          "day_number": 1,
          "date": "2014-01-30"
        },
        {
          "value": 22982,
          "total": 53141,
          "day_number": 2,
          "date": "2014-01-30"
        }
      ]
    }
    

