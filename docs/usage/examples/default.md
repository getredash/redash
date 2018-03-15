---
categories:
- redash-hacks
collection: examples
helpscout_url: https://help.redash.io/article/139-default
keywords: null
name: Default Parameter Value
slug: default
---
Schedules and alerts don't handle parameters super well so you'll need to
create a specific query with the value you want to have a scheduled query
and/or an alert (alerts require scheduled queries anyway) or using filters
that only run on the client side while querying all options.

This way you can have an "all" parameter that shows all values, which will
allow you to get alerts and schedule the query.

    
    
    CASE
            WHEN '{{date}}' = 'All' THEN date IS NOT NULL
            ELSE date = '{{date}}'
      END
    

Kelly (thanks Kelly!) from Hudl shared this in our [Slack
community](http://slack.redash.io/).

