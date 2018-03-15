---
categories:
- querying
collection: user-guide
helpscout_url: https://help.redash.io/article/44-query-parameters
keywords:
- variable
- variables
- template
name: Query Parameters
slug: query-parameters
---
To make queries more dynamic without the need to change their source code, you
can use parameters ****. A parameter is being defined by adding a keyword
within curly braces inside your query text:

    
    
    SELECT count(0)
    FROM events
    WHERE action = '{{action}}'
    

In the above example `{{action}}` is the parameter definition. Once added and
recognized by Redash, you will see parameter input box appear:

![](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a0951a22c7d3a272c0d99bd
/file-o7Gfv8oYHD.png)

Now you can input any value in this text box and execute the query to get the
results.

### Parameter Settings

Clicking on the cog icon next to the parameter will open its settings window:

![](https://s3.amazonaws.com/helpscout.net/docs/assets/5877897f90336009736c5d9b/images/5a09524d04286331992465de
/file-FC6jmuhei4.png)

  * **Title** : by default the parameter title will be the same as the keyword in the query text. If you want to give it a friendlier name, you can change it here.
  * **Type** : by default, each parameter starts as a text type. You can change the type (and the UI presented for it) here. Supported types: Text, Number, Date, Date and Time, Date and Time (with Seconds), Dropdown List.
  * **Global** : by default when placed on a dashboard as a widget, each query will have its own parameter input box. But when set to _Global_ , it will have a single input box for all queries who share the same parameter name (and set to _Global_ ). 
    * When using Global Parameters you need to make sure that: 
      * The parameters have the same name (the part in {{}}) across the different queries.
      * All of them have the "Global" checkbox toggled.

IMPORTANT: currently parameters only work within Redash and are not supported
in embeds or shared dashboards. Also, parameters require Full Access
permission to the data source (vs. View Only).

