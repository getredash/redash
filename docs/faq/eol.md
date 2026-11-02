---
title: Hosted Redash End of Life
sidebar:
  order: 3
---

## What is happening?

We are shutting down the hosted Redash service at app.redash.io, effective
November 30, 2021. No new customer sign ups are allowed.

Existing customers can continue to use the service free of charge until November
30, 2021.

## Why are you doing this?

In order to focus our efforts on establishing best in class experiences for SQL
analysts within Databricks as our paid offering.

## How will I migrate my data (queries, dashboards, alerts, etc)?

See the instructions for our [migration tool]. If you have questions please post
on our [GitHub Discussions].

[migration tool]: https://github.com/getredash/redash-toolbelt/tree/master/redash_toolbelt/docs/redash-migrate
[GitHub Discussions]: https://github.com/getredash/redash/discussions

## What will happen to my data?

All customer data in app.redash.io will be deleted within thirty days after
access to the service ends on November 30, 2021. Please migrate prior to that
date, as you will not be able to migrate after it ends.

## Who can I contact for help?

If you encounter any difficulties or have questions, please visit the
[GitHub Discussions](https://github.com/getredash/redash/discussions).

## Should I switch to Databricks SQL or to OSS Redash?

If you are using Databricks today, we encourage you to migrate to Databricks
SQL. If you need access to additional third party data sources, we encourage you
to migrate to the
[open source version of Redash](https://redash.io/help/open-source/setup), which
you can host for yourself free of charge.
