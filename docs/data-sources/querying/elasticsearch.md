---
title: Elasticsearch
---

:::danger

The Redash ES connector was a community contribution from several years ago.
There are many bugs and it needs to be rewritten. Work was started, but
currently blocked as we don't have the resources to test the new implementation.
We're happy for assistance if someone wants to help (see
[here](https://github.com/getredash/redash/pull/4391)).

:::

Redash supports two flavors of Elasticsearch queries, Lucene/string style
queries (like Kibana) and the more elaborate JSON based queries. For the first
one create a data source of type `Kibana` and for the later create data source
of type `Elasticsearch`.

## String query example:

- Query the index named “twitter”
- Filter by “user:kimchy”
- Return the fields: “@timestamp”, “tweet” and “user”
- Return up to 15 results
- Sort by @timestamp ascending

```json
{
  "index": "twitter",
  "query": "user:kimchy",
  "fields": ["@timestamp", "tweet", "user"],
  "limit": 15,
  "sort": "@timestamp:asc"
}
```

## Simple query on a logstash Elasticsearch instance:

- Query the index named “logstash-2015.04.\* (in this case its all of
  April 2015)
- Filter by type:events AND eventName:UserUpgrade AND channel:selfserve
- Return fields: “@timestamp”, “userId”, “channel”, “utm_source”, “utm_medium”,
  “utm_campaign”, “utm_content”
- Return up to 250 results
- Sort by @timestamp ascending

```json
{
  "index": "logstash-2015.04.*",
  "query": "type:events AND eventName:UserUpgrade AND channel:selfserve",
  "fields": [
    "@timestamp",
    "userId",
    "channel",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content"
  ],
  "limit": 250,
  "sort": "@timestamp:asc"
}
```

## JSON document query on a ElasticSearch instance:

- Query the index named “twitter”
- Filter by user equal “kimchy”
- Return the fields: “@timestamp”, “tweet” and “user”
- Return up to 15 results
- Sort by @timestamp ascending

```json
{
  "index": "twitter",
  "query": {
    "match": {
      "user": "kimchy"
    }
  },
  "fields": ["@timestamp", "tweet", "user"],
  "limit": 15,
  "sort": "@timestamp:asc"
}
```

## A note on authentication

Redash has two data sources available for Elasticsearch. You need to use the
Amazon Elasticsearch service source if you're using IAM based authentication.
Otherwise, use the standard data source.
