---
title: Setting Up An Alert
keywords:
  - Set up Alert
  - setup alert
  - setup an alert
  - queries with parameters
  - trigger alert
  - alert destinations
  - alert destination
sidebar:
  order: 1
---

Redash alerts notify you when a field returned by a [**Scheduled
Query**](/help/user-guide/querying/scheduling-a-query/) meets a
threshold. Use them to monitor your business. Or integrate them with tools like
Zapier or IFTTT to kickoff workflows such as user onboarding or support tickets.
Alerts complement scheduled queries, but their criteria are checked after every
execution.

:::caution

For information on alerts prior to Redash V9, see our
[**Legacy Alerts doc**](setting-up-an-alert-v8).

:::

:::caution

A query schedule is not required but is _highly recommended_ for alerts. If you
add an alert to a non-scheduled query you will be notified only if a user
executes the query manually and the alert criteria are met.

:::

:::caution

Alerts don't work for queries with parameters.

:::

To see a list of current Alerts, click **Alerts** on the navbar. By default, they
are sorted in reverse chronological order by the **Created At** column. You can
reorder the list by clicking the column headings.

- **Name** shows the string name of each alert. You can change this at any time.
- **Created By** shows the user that created this Alert.
- **State** shows whether the Alert status is `UNKNOWN`, `TRIGGERED`, or `OK`.

![](/assets/images/docs/gitbook/alerts.png)

## Usage

Click the **Create** button in the navbar and then click **New Alert**.

![](/assets/images/docs/gitbook/create-alert.png)

Search for a target query. If you don't see the one you want, make sure it is
published and does not use parameters.

![](/assets/images/docs/gitbook/new-alert-query-search.png)

Use the settings panel to configure your alert.

- The **Value column** dropdown controls which field of your query result will
  be evaluated.
- The **Condition** dropdown controls the logical operation to be applied.
- The **Threshold** text input will be compared against the _Value column_
  using the _Condition_ you specify.

![](/assets/images/docs/gitbook/alert_settings_V9.png)

:::note

If a target query returns multiple records, Redash Alerts only see the first
one. As you change the Value Column setting, the current value of that field in
the top row is shown beneath it.

:::

Next, adjust how many notifications to receive while your alert is triggered.
There are three options:

- **Just Once** means a notification will fire any time the alert status changes
  from `OK` to `TRIGGERED`.
- **Each time alert is evaluated** means a notification will fire whenever the
  alert status is `TRIGGERED` regardless of its status as of the previous
  evaluation.
- **At most every** lets you set a minimum interval between notifications. It
  splits the difference between _Just Once_ and _Each time alert is evaluated_.
  This choice lets you avoid notification spam for alerts that trigger often.

Regardless of which notification setting you pick here, you will receive a
notification whenever the status goes from `OK` to `TRIGGERED` or from
`TRIGGERED` to `OK`. The schedule settings above only impact how many
notifications you will receive if the status remains `TRIGGERED` from one
execution to the next.

Finally, pick a **Template**. The default template is a message with links to
the Alert configuration screen and the Query screen. Many users will want to
include more specific information about the Alert. To do this you can [Customize
The Alert
Template](/help/user-guide/alerts/custom-alert-notifications/).

When you're finished, click **Create Alert** and then choose an [Alert
Destination](/help/user-guide/alerts/creating-new-alert-destination/).
If you skip this step you will not be notified when the alert is triggered.

![](/assets/images/docs/gitbook/alert_destination.png)

### Muting Alerts

You can temporarily mute an alert's notifications without deleting the alert entirely. Just click the vertical ellipsis (`⋮`) menu and choose _Mute Notifications_.

To resume notifications again, click the vertical ellipsis menu and choose _Unmute Notifications_.

## Alert Statuses

- `TRIGGERED` means that on the most recent execution, the _Value Column_ in
  your target query met the _Condition_ and _Threshold_ you configured. If your
  alert checks whether "cats" is above 1500, your alert will be triggered as
  long as "cats" is above 1500.
- `OK` means that on the most recent query execution, the _Value Column_ did not
  meet the _Condition_ and _Threshold_ you configured. This doesn't mean that
  the Alert was not triggered previously. If your "cats" value is now 1470 your
  alert will show as OK.
- `UNKNOWN` means Redash does not have enough data to evaluate the alert
  criteria. You will see this status immediately after creating your Alert until
  the query has executed. You will also see this status if there was no data in
  the query result or if the most recent query result doesn't include the _Value
  Column_ you configured.

## Notification Frequency

Redash sends notifications to your chosen Alert Destinations whenever it detects
that the Alert status has changed from `OK` to `TRIGGERED` or vice versa.
Consider this example where an Alert is configured on a query that is scheduled
to run once daily. The daily status of the Alert appears in the table below.
Prior to Monday the alert status was `OK`.

| Day       | Alert Status |
| --------- | ------------ |
| Monday    | OK           |
| Tuesday   | OK           |
| Wednesday | TRIGGERED    |
| Thursday  | TRIGGERED    |
| Friday    | TRIGGERED    |
| Saturday  | TRIGGERED    |
| Sunday    | OK           |

If the notification frequency is set to _Just Once_, Redash would send a
notification on Wednesday when the status changed from `OK` to `TRIGGERED` and
again on Sunday when it switches back. It will not send alerts on Thursday,
Friday, or Saturday unless you specifically configure it to do so because the
Alert status did not change between executions on those days.
