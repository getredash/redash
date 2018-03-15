---
categories:
- redash-hacks
collection: examples
helpscout_url: https://help.redash.io/article/138-image
keywords: null
name: Images Inside Tables
slug: image
---
You can add images in your table by using the `img` tag.

For example:

    
    
    SELECT cat, '<img src="https://demo.redash.io/images/'|| cat ||'.png" alt="cat" width="'||20||'" height="20";>' AS image
    FROM cats
    

Please note that || is a PostgreSQL operator/function - for other databases,
you'll need to use the suitable concat operator.

You can view a [live example](http://demo.redash.io/queries/1896/source#table)
in our demo account.

