---
title: Adding New Alert Destinations
sidebar:
  order: 3
---

## Intro

Whenever an Alert triggers, it sends a blob of related data (called the Alert Template) to its designated **Alert Destinations**. Destinations can use this blob of data to fire off emails, Slack messages, or custom web hooks. You can set up new Alert Destinations from the settings screen.

![](/assets/images/docs/gitbook/create-new-alert-destination.png)

:::caution

Only Admins can add new alert destinations. Destinations are available to all users once configured.

:::

## Add A New Alert Destination

There are a few types of destinations to choose from:

- Email
- Slack
- PagerDuty
- Mattermost
- Google Hangouts Chat
- HipChat
- ChatWork
- Generic WebHook

:::note

The default destination for any alert is the email address for the user who created it. If you made an alert and need to be notified by email then you don't need to setup a new Alert Destination. Instead, toggle the switch beside your email address on the alert setup screen.

:::

To configure one, select it from **Create a New Alert Destination** dialogue and follow its prompts.

![](/assets/images/docs/gitbook/pick-a-destination.png)

### PagerDuty

First you need to obtain the PagerDuty Integration Key from your PagerDuty console.

Services > Service Details > Integrations

![](/assets/images/docs/alerts/pagerduty-key-location.png)

If you don't have an API v2 Integration yet, you need to create it.

After obtaining the Integration Key:

1. Open "Alert Destinations" tab in the settings screen, and click on "+ New Alert Destination".
2. In the form that opens pick "PagerDuty" as the type.
3. The mandatory fields are Name and Integration Key.
4. You add this new destination for any alert that you want to trigger PagerDuty incident.

![](/assets/images/docs/gitbook/pagerduty.png)

### Slack

1. Open "Alert Destinations" tab in the settings screen, and click on "+ New Alert Destination".
2. In the form that opens pick "Slack" as the type.
3. Set the name, channel, etc. and provide a "Slack Webhook URL", which you can create here: <https://my.slack.com/services/new/incoming-webhook/>. If the Webhook target is a channel in the channel field make sure to prefix the channel name with `#` (i.e. `#marketing`). If the destination is a direct message to a user, prefix it with `@` (i.e. `@smartguy`).
4. You add this new destination for any alert that you want to be sent to Slack.

![](/assets/images/docs/gitbook/slack-destination.png)
