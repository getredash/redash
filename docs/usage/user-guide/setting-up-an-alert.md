---
categories:
- alerts
collection: user-guide
helpscout_url: https://help.redash.io/article/67-setting-up-an-alert
keywords:
- Set up Alert
- setup alert
- setup an alert
- queries with parameters
- trigger alert
- alert destinations
- alert destination
name: Setting Up An Alert
slug: setting-up-an-alert
---
In the Alerts view, you'll see all existing alerts and an option to create a
new one.

![](https://redash.io/help/assets/alerts.png)

To set up a new alert you'll need to follow these steps:

1

    Select the query you want to trigger an alert for (just start typing) - queries with parameters won't work 
2

    Select the column you want to watch 
3

    Select the trigger type (greater/less than or equals to) 
4

    Select your magic number

![](https://redash.io/help/assets/alerts_settings.png)

5

    Leave Rearm Seconds empty to get 1 alert when the status changes from Triggered to OK, enter a number to get an alert every time the query runs (by schedule) + the Rearm seconds value. 
6

    SAVE 
7

    Define alert destinations - email, [Slack](https://redash.io/help/alerts/slack-alert-destination.html), HipChat and webhooks are supported.

![](https://redash.io/help/assets/alert_destination.png)

