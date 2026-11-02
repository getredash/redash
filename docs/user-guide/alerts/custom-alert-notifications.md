---
title: Customizing Alert Notifications
keywords:
  - Alert
  - Notification
  - Template
  - Custom Template
  - Formatting
  - Email
  - Customize
  - Customizing
sidebar:
  order: 5
---

Redash alerts can notify you when your queries match some arbitrary criteria. If you wish to modify the notification message, click the "Edit" button at the top of the alert page.

Next to the setting labeled "Template", click the dropdown and select "Custom template".
A box will appear, consisting of input fields for subject and body.

Any static content is valid, and you can also incorporate some built-in template variables:

- `ALERT_STATUS` - The evaluated alert [status](/help/user-guide/alerts/setting-up-an-alert/#Alert-Status-&-Frequency) (string).
- `ALERT_CONDITION` - The alert [condition operator](/help/user-guide/alerts/setting-up-an-alert/#Configuration-settings) (string).
- `ALERT_THRESHOLD` - The alert [threshold](/help/user-guide/alerts/setting-up-an-alert/#Configuration-settings) (string or number).
- `ALERT_NAME` - The alert name (string).
- `ALERT_URL` - The alert page url (string).
- `QUERY_NAME` - The correlated query name (string).
- `QUERY_URL` - The correlated query page url (string).
- `QUERY_RESULT_VALUE` - The query result value (string or number).
- `QUERY_RESULT_ROWS` - The query result rows (value array).
- `QUERY_RESULT_COLS` - The query result columns (string array).
- `QUERY_RESULT_TABLE` - Query results formatted as two dimensional array of values.

An example subject, for instance, could be:
`Alert "{{ALERT_NAME}}" changed status to {{ALERT_STATUS}}`

Click the "Preview" toggle button to preview the rendered result and save your changes by clicking the "Save" button.

:::caution

The preview is useful for verifying that template variables get rendered correctly. It is not an accurate representation of the eventual notification content, as each alert destinations can display notifications differently.

:::

To return to the default Redash message templates, reselect "Default template" at any time.
