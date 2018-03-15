---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/111-querying-elasticsearch
keywords: null
name: Querying Elasticsearch
slug: querying-elasticsearch
---
Redash supports two flavors of Elasticsearch queries, Lucene/string style
queries (like Kibana) and the more elaborate JSON based queries. For the first
one create a data source of type  `Kibana` and for the later create data
source of type `Elasticsearch`.

## String query example:

  * Query the index named “twitter”
  * Filter by “user:kimchy”
  * Return the fields: “@timestamp”, “tweet” and “user”
  * Return up to 15 results
  * Sort by @timestamp ascending

    
    
    {
    	"index": "twitter",
    	"query": "user:kimchy",
    	"fields": ["@timestamp", "tweet", "user"],
    	"limit": 15,
    	"sort": "@timestamp:asc"
    }
    

## Simple query on a logstash Elasticsearch instance:

  * Query the index named “logstash-2015.04.* (in this case its all of April 2015)
  * Filter by type:events AND eventName:UserUpgrade AND channel:selfserve
  * Return fields: “@timestamp”, “userId”, “channel”, “utm_source”, “utm_medium”, “utm_campaign”, “utm_content”
  * Return up to 250 results
  * Sort by @timestamp ascending

    
    
    {
    	"index": "logstash-2015.04.*",
    	"query": "type:events AND eventName:UserUpgrade AND channel:selfserve",
    	"fields": ["@timestamp", "userId", "channel", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
    	"limit": 250,
    	"sort": "@timestamp:asc"
    }
    

## JSON document query on a ElasticSearch instance:

  * Query the index named “twitter”
  * Filter by user equal “kimchy”
  * Return the fields: “@timestamp”, “tweet” and “user”
  * Return up to 15 results
  * Sort by @timestamp ascending

    
    
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
    

