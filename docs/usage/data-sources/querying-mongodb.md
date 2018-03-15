---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/113-querying-mongodb
keywords: null
name: Querying MongoDB
slug: querying-mongodb
---
We take the JSON query you pass and convert it to a
[db.collections.find](https://docs.mongodb.com/manual/reference/method/db.collection.find/)
call. The query part is named `query` in the JSON document and projection is
named `fields`. You can also pass a `sort` dictionary that defines the sorting
order (see example below), `skip` and `limit` for pagination and if set a
value (any value) to `count` it will perform a count query.

Also you can do aggregate queries (
[db.collection.aggregate](https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/))
by passing an `aggregate`  dictionary.

### Simple Query Example

    
    
    {
    	"collection": "my_collection",
    	"query": {
    		"type": 1
    	},
    	"fields": {
    		"_id": 1,
    		"name": 2
    	},
    	"sort": [{
    		"name": "date",
    		"direction": -1
    	}]
    }
    

### Count Query Example

    
    
    {
    	"collection": "my_collection",
    	"count": true
    }
    

###

### Aggregation

Aggregation uses a syntax similar to the one used in PyMongo. However, to
support the correct order of sorting, it uses a regular list for the “$sort”
operation that converts into a SON (sorted dictionary) object before
execution.

Aggregation query example:

    
    
    {
    	"collection": "things",
    	"aggregate": [{
    		"$unwind": "$tags"
    	}, {
    		"$group": {
    			"_id": "$tags",
    			"count": {
    				"$sum": 1
    			}
    		}
    	}, {
    		"$sort": [{
    			"name": "count",
    			"direction": -1
    		}, {
    			"name": "_id",
    			"direction": -1
    		}]
    	}]
    }
    

### MongoDB Extended JSON Support

We support  [MongoDB Extended JSON](https://docs.mongodb.com/manual/reference
/mongodb-extended-json/) along with our own extension - `$humanTime`:

    
    
    {
    	"collection": "date_test",
    	"query": {
    		"lastModified": {
    			"$gt": {
    				"$humanTime": "3 years ago"
    			}
    		}
    	},
    	"limit": 100
    }
    

It accepts a human-readable string like the above (“3 years ago”, “yesterday”,
etc) or timestamps.

### MongoDB Filtering

You can add filters to Mongo queries by projecting a column with the
'::filter' keyword added on to the end.

    
    
    {
    	"collection": "zipcodes",
    	"aggregate": [{
    		"$project": {
    			"_id": "$_id",
    			"city": "$city",
    			"loc": "$loc",
    			"pop": "$pop",
    			"state::filter": "$state"
    		}
    	}]
    }
    

The above example will show a 'State' column, and allow you to filter on this
column.

