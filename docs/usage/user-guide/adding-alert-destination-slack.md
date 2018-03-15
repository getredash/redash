---
categories:
- alerts
collection: user-guide
helpscout_url: https://help.redash.io/article/68-adding-alert-destination-slack
keywords: null
name: Adding Slack Alert Destination
slug: adding-alert-destination-slack
---
1

    Open "Alert Destinations" tab in the settings screen, and click on "+ New Alert Destination".
2

    In the form that opens pick "Slack" as the type.
3

    Set the name, channel, etc. and provide a "Slack Webhook URL", which you can create here: <https://my.slack.com/services/new/incoming-webhook/>. If the Webhook target is a channel in the channel field make sure to prefix the channel name with `#` (i.e. `#marketing`). If the destination is a direct message to a user, prefix it with `@` (i.e. `@smartguy`).
4

    You add this new destination for any alert that you want to be sent to Slack.

Only users with admin rights can create new destinations, but any user can use
them in their alerts once created.

