---
categories:
- user-groups-permissions
collection: user-guide
helpscout_url: https://help.redash.io/article/73-permissions-groups
keywords: null
name: Permissions & Groups
slug: permissions-groups
---
Redash's permissions model based on groups and associated data sources. Group
membership defines the actions a user is allowed to take (although currently
there's no UI to edit group action permissions), and which data sources they
have access to (for this we have UI).

### How does it work?

Each user belongs to one or more groups. By default, each user joins the
Default group. The common data sources should be associated with the Default
group.

Each data source will be associated with one or more groups. Each connection
to a group will define, whether this group has **Full access** to this data
source (view existing queries and run new ones) or **View Only access** ,
which allows only viewing existing queries and results.

Any dashboard can contain visualizations from any data source (as long as the
creating user has access to them). When a user who doesn’t have access to a
visualization (because he doesn’t have access to the data source) opens a
dashboard, he'll see where a visualization would be but won't be able to see
any details. The screenshot shown below shows a Dashboard Widget with a
visualization the user doesn’t have access to.

If a user has access to at least one widget on a dashboard, they'll be able to
see the dashboard in the list of all dashboards.

### What if I want to limit the user to only some tables?

The idea is to leverage your database’s security model and hence create a user
with access to the tables/columns you want to give access to. Create a data
source that's using this user and then associate it with a group of users who
need this level of access.

