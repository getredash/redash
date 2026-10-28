---
title: Microsoft Azure SQL Database & Synapse
---

:::caution

Redash V9 introduced an ODBC connector for SQL Server that improves Azure compatibility. Going forward, use the **Microsoft SQL Server (ODBC)** type. The old connector will be removed in a future release.

:::

![](/assets/images/docs/gitbook/mssql-ds-choice.png)

When entering the username you need to make sure it's of the form: `user@server-name`. Where `server-name` is your server address without the `.database-windows.net` suffix.

Check out [Microsoft's documentation](https://docs.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/create-data-warehouse-portal#create-a-server-level-firewall-rule) for instructions to whitelist your Redash IP address when connecting to Synapse.
