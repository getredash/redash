---
title: CSV Files
---

Redash can read CSV files and Excel spreadsheets from any accessible URL.

:::note

If the target Excel workbook contains multiple sheets, the first sheet will be used.

:::

Both the CSV and Excel query runners use YAML syntax to write queries.

Your query should include a `url` key and optionally a `user-agent` key that will be sent with your request.

```yaml
url: "https://www.example.com/path/to/file.xlsx"

user-agent: "Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"
```

To query Excel or CSV files with SQL, you can use the [QRDS](/help/user-guide/querying/query-results-data-source/) in a separate query.
