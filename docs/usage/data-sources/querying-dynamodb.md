---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/163-querying-dynamodb
keywords: null
name: Querying DynamoDB
slug: querying-dynamodb
---
When connecting to DynamoDB we use a library named DQL to parse your queries
into DynamoDB API calls. To learn more about how to write DQL queries, you can
check [their
documentation](https://dql.readthedocs.io/en/latest/topics/queries/select.html).

* * *

 **"No index found for query. Please use a SCAN query, or set
allow_select_scan=True opt allow_select_scan true" Error Message**

In case you receive the above error message, you need to replace SELECT in
your query with SCAN.

