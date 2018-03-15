---
categories:
- alerts
collection: user-guide
helpscout_url: https://help.redash.io/article/70-alert-multiple-columns
keywords:
- Multiple Columns
- Alert Multiple Columns
- Alert
- ''
name: Multiple Column Alert
slug: alert-multiple-columns
---
There's an indirect way to set an Alert based on multiple columns of a query:

Your query can implement the alert logic and return a boolean value for the
Alert to trigger on. Something like:

    
    
    SELECT CASE WHEN drafts_count > 10000 AND archived_count > 5000 THEN 1 ELSE 0 END
    FROM (
    SELECT sum(CASE WHEN is_archived THEN 1 ELSE 0 END) AS archived_count,
    sum(CASE WHEN is_draft THEN 1 ELSE 0 END) AS drafts_count
    FROM queries) data
    

This query will return 1 when drafts_count > 10000 and archived_count > 5000\.
Then you can configure the alert to trigger when the value is 1.

