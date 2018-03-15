---
categories:
- querying
collection: user-guide
helpscout_url: https://help.redash.io/article/39-query-snippets-shortcuts
keywords: null
name: Query Snippets
slug: query-snippets-shortcuts
---
Query snippets are small (or not so small) pieces of queries you want to share
with your team to reduce the need to type them over and over again or looking
for a reference.

You can create them at  `https://app.redash.io/<your company>/query_snippets`
(currently only admins can create them, but anyone can use).

![](https://redash.io/help/assets/Snippet.png)

A snippet can be something like: (the ${1:table} part is a placeholder)

    
    
    JOIN organizations org ON org.id = $ {
    	1: table
    }.org_id
    
    

Here are some other ideas for snippets:

  * `JOIN`s you use a lot (`JOIN on table1.id = .user_id`)
  * Clauses like `WITH` and `CASE` (`WITH active_users as (SELECT COUNT(DISTINCT user_id) AS active_users_count FROM events_log WHERE created_at > CURRENT_DATE - 7 GROUP BY 1)`)
  * [Conditional Formatting](http://help.redash.io/article/136-condition)
  * [Clickable URLs in tables](http://help.redash.io/article/137-clickable)
  * [Images Inside tables](http://help.redash.io/article/138-image)
  * [Default Parameter Value](http://help.redash.io/article/139-default)

You can then trigger them while writing a query with the trigger word you
define - it'll be suggested (auto-completed) like all other fields.

