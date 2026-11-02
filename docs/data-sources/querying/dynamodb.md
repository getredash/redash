---
title: DynamoDB
---

When connecting to DynamoDB we use a library named DQL to parse your queries
into DynamoDB API calls. To learn more about how to write DQL queries, we recommend checking their
documentation on [SELECT queries](https://dql.readthedocs.io/en/latest/topics/queries/select.html) and [Data Types](https://dql.readthedocs.io/en/latest/topics/data_types.html).

### Troubleshooting

> **Error message**: "No index found for query. Please use a SCAN query, or set
> allow_select_scan=True opt allow_select_scan true" Error Message

In case you receive the above error message, you need to replace `SELECT` in
your query with `SCAN`.
