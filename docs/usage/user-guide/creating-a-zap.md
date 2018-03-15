---
categories:
- integrations-and-api
collection: user-guide
helpscout_url: https://help.redash.io/article/130-creating-a-zap
keywords: null
name: Creating a Zap in Zapier for New Query Results
slug: creating-a-zap
---
You can connect Redash to Zapier and trigger an action every time a new line
is added to your query results - for example, a Slack bot that announces every
time a new order came in. The best way is to have a scheduled query that
refreshes frequently so the notification you get is in real-time.

Here's a short example of connecting Redash to Zapier and creating a new Zap:

1

    Use [this invitation](https://zapier.com/developer/invite/32785/4910e4da7931a8f3a2124ebd85cc352b/) link for the beta Redash trigger app (create an account if needed) and click "Make a Zap" right next to your account area at the top of the page. 
2

    Choose a trigger app - in this case, Redash (it won't be available to you unless you have received and opened the invitation) 
3

    Choose a trigger - for now, we have only "New Query Results" in there, this means the Zap will get triggered everytime a new line is added to the results set of your query. The free Zapier account supports checking for new results every 15 minutes so you should schedule the query to refresh according to the frequency in Zapier. 
4

    Connect your Redash account to Zapier: 
4.1

    . Full domain of your Redash account (Something like:  `https://app.redash.io/myorg/` or `https://redash.myorg.com/` (note the slash at the end)) 
4.2

     Your User ID - go to your account in Redash, the number in the URL just after /users/ is your User ID, i.e.  `https://app.redash.io/myorg/users/{user id}`
4.3

     API key - also in your user settings, select the API KEY tab and copy it from there ![](https://redash.io/help/assets/user_api_key.png)
4.4

     Test your connection! 
5

    Select the query you want to get the Zap for by entering the query ID (`https://app.redash.io/myorg/queries/{query id}`) 
6

    Select the app you want to perform an action when a new query result is added to your query - Slack is a good option. 
7

    Select an action - for this example, we'll use "Send Channel Message". You'll need to connect your Slack account to Zapier as well if you are logged-in in your browser it'll be pretty instant. 
8

    Enter the channel, message text (you can select different column values from your query), bot/your user in slack, bot name, bot icon emoji or icon url, auto expend links and mentions settings. Bots are cool so you should definitely send the zap as a bot. 

![](https://redash.io/help/assets/%E2%80%8F%E2%80%8Fzapier_slack_template_wider.png)

**Test your connection and turn your zap on!**

![](https://redash.io/help/assets/zappy_bot.png)

