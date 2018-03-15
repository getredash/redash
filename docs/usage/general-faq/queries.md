---
categories:
- troubleshooting
collection: general-faq
helpscout_url: https://help.redash.io/article/147-queries
keywords: null
name: Queries With Large Data Sets Take A Long Time To Run
slug: queries
---
Sometimes a query with large results (over a few hundred thousand) can take a
long time to run.

Here are a few reasons this might happen:

1

    **Your database**  \- Redash passes the query AS IS and it's your database's responsibility to handle your query 
2

    **Memory of the query runner** (that's us)  \- there needs to be enough memory to handle the result set. In this case, if the result set is too large, the query might fail and you should see an error. 
3

    **Network**  \- some really large queries might take a while to download. While downloading the results, the UI might still say that the query is being executed while in fact, it's just waiting for the data to reach your browser. 

Another aspect is that the browser needs to be able to render all this data -
this varies from visualization to visualization (tables are easier to render).

IMPORTANT TO NOTE: The relevant size (for Redash) is the size of the results.
You can query a few rows or terabytes of data, it's all the same for us. It's
your database that needs to handle this, while we handle the results.

