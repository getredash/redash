.. image:: http://redash.io/static/old_img/redash_logo.png
   :width: 200px

Open Source Data Collaboration and Visualization Platform
===================================

**Re:dash** is our take on freeing the data within our company in a way that will better fit our culture and usage patterns.

Prior to **Re:dash**, we tried to use traditional BI suites and discovered a set of bloated, technically challenged and slow tools/flows. What we were looking for was a more hacker'ish way to look at data, so we built one.

**Re:dash** was built to allow fast and easy access to billions of records, that we process and collect using Amazon Redshift ("petabyte scale data warehouse" that "speaks" PostgreSQL).
Today **_re:dash_** has support for querying multiple databases, including: Redshift, Google BigQuery,Google Spreadsheets, PostgreSQL, MySQL, Graphite and custom scripts.

Features
########

1. **Query Editor**: think of `JS Fiddle`_ for SQL queries. It's your way to share data in the organization in an open way, by sharing both the dataset and the query that generated it. This way everyone can peer review not only the resulting dataset but also the process that generated it.
2. **Visualizations**: once you have a dataset, you can create different visualizations out of it. Currently it supports charts, pivot table and cohorts.
3. **Dashboards**: combine several visualizations into a single dashboard.

Demo
####

.. figure:: https://cloud.githubusercontent.com/assets/71468/17391289/8e83878e-5a1d-11e6-8938-af9054a33b19.gif
   :alt: Screenshots

You can try out the demo instance: `http://demo.redash.io`_ (login with any Google account).

.. _http://demo.redash.io: http://demo.redash.io
.. _JS Fiddle: http://jsfiddle.net

Getting Started
###############

:doc:`Setting up Re:dash instance </setup>` (includes links to ready made AWS/GCE images).

Getting Help
############

* Source: https://github.com/getredash/redash
* Issues: https://github.com/getredash/redash/issues
* Discussion Forum: https://discuss.redash.io/
* Slack: http://slack.redash.io/
* Gitter (chat): https://gitter.im/getredash/redash

TOC
###

.. toctree::
   :maxdepth: 2

   setup
   upgrade
   datasources
   usage
   dev
   misc
