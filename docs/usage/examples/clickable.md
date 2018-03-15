---
categories:
- redash-hacks
collection: examples
helpscout_url: https://help.redash.io/article/137-clickable
keywords: null
name: Clickable URLs in Tables
slug: clickable
---
You can use this template to create clickable links in your table:

    
    
    SELECT 'http://demo.redash.io/queries/' || id  || '/source' AS url, name, created_at
    FROM queries
    WHERE is_archived = false
    AND name != 'New Query'
    

Please note that || is a PostgreSQL operator/function - for other databases,
you'll need to use the suitable concat operator.

The results will be clickable links, like in this query in our demo account:
<http://demo.redash.io/queries/3420/source>![](https://redash.io/help/assets/url_results.png)

You can also use the anchor tag to show a name instead of the URL:

    
    
    SELECT '<a href="https://demo.redash.io/queries/' || id || '">' || name || '</a>' as name
    ...
    

