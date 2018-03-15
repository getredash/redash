---
categories:
- querying
collection: data-sources
helpscout_url: https://help.redash.io/article/112-querying-jira
keywords: null
name: Querying JIRA (JQL)
slug: querying-jira
---
For a simple query, one that returns issues with no filtering:

    
    
    {}
    

Return only specific fields:

    
    
    {
    	"fields": "summary,priority"
    }
    
    

Return only specific fields and filter by priority:

    
    
    {
    	"fields": "summary,priority",
    	"jql": "priority=medium"
    }
    
    

Count number of issues with  `priority=medium`:

    
    
    {
    	"queryType": "count",
    	"jql": "priority=medium"
    }
    
    

You can also use the field mapping to rename a field for the result - this is
useful when working with custom fields:

    
    
    {
    	"fields": "summary,priority,customfield_10672",
    	"jql": "priority=medium",
    	"fieldMapping": {
    		"customfield_10672": "my_custom_field_name"
    	}
    }
    
    

Some fields returned by JIRA are JSON objects with multiple properties. You
can define a field mapping to pick a specific member property you want to
return (in this example 'id' member of the 'priority' field):

    
    
    {
    	"fields": "summary,priority",
    	"jql": "priority=medium",
    	"fieldMapping": {
    		"priority.id": "priority"
    	}
    }
    
    

Here's a more complex example combining the different filter options:

    
    
    {
    	"fields": "summary,priority,customfield_10672,resolutiondate,fixVersions,watches,labels",
    	"jql": "project = MYPROJ AND resolution = unresolved ORDER BY priority DESC, key ASC",
    	"maxResults": 30,
    	"fieldMapping": {
    		"customfield_10672": "my_custom_field_name",
    		"priority.id": "priority",
    		"fixVersions.name": "my_fix_version",
    		"fixVersions.id": "my_fix_version_id"
    	}
    }
    
    

If a field contains a list of values all are returned concatenated with ",".

