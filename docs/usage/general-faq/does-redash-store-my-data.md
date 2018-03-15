---
categories:
- hosted-redash
collection: general-faq
helpscout_url: https://help.redash.io/article/159-does-redash-store-my-data
keywords: null
name: Does Redash Store My Data?
slug: does-redash-store-my-data
---
Yes.

Each time you run a query we cache the query results.  This means there's
always some subset of your data cached in our system. The most recent query
result is cached indefinitely.

Currently,  this information is cached in our DB but we're considering moving
to S3 at some point.

