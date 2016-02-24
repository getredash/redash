More details about the future of re:dash : http://bit.ly/journey-first-step

---

<p align="center">
  <img title="re:dash" src='http://redash.io/static/old_img/redash_logo.png' width="200px"/>
</p>
<p align="center">
    <img title="Build Status" src='https://circleci.com/gh/getredash/redash.png?circle-token=8a695aa5ec2cbfa89b48c275aea298318016f040'/>
</p>

**_re:dash_** is our take on freeing the data within our company in a way that will better fit our culture and usage patterns.

Prior to **_re:dash_**, we tried to use traditional BI suites and discovered a set of bloated, technically challenged and slow tools/flows. What we were looking for was a more hacker'ish way to look at data, so we built one.

**_re:dash_** was built to allow fast and easy access to billions of records, that we process and collect using Amazon Redshift ("petabyte scale data warehouse" that "speaks" PostgreSQL).
Today **_re:dash_** has support for querying multiple databases, including: Redshift, Google BigQuery, PostgreSQL, MySQL, Graphite,
Presto, Google Spreadsheets, Cloudera Impala, Hive and custom scripts.

**_re:dash_** consists of two parts:

1. **Query Editor**: think of [JS Fiddle](http://jsfiddle.net) for SQL queries. It's your way to share data in the organization in an open way, by sharing both the dataset and the query that generated it. This way everyone can peer review not only the resulting dataset but also the process that generated it. Also it's possible to fork it and generate new datasets and reach new insights.
2. **Dashboards/Visualizations**: once you have a dataset, you can create different visualizations out of it, and then combine several visualizations into a single dashboard. Currently it supports charts, pivot table and cohorts.

**_re:dash_** is a work in progress and has its rough edges and way to go to fulfill its full potential. The Query Editor part is quite solid, but the visualizations need more work to enrich them and to make them more user friendly.

## Demo

<img src="https://cloud.githubusercontent.com/assets/71468/12611424/1faf4d6a-c4f5-11e5-89b5-31efc1155d2c.gif" width="60%"/>

You can try out the demo instance: http://demo.redash.io/ (login with any Google account).

## Getting Started

* [Setting up re:dash instance](http://redash.io/deployment/setup.html) (includes links to ready made AWS/GCE images).
* [Documentation](http://docs.redash.io).


## Getting help

* [Google Group (mailing list)](https://groups.google.com/forum/#!forum/redash-users): the best place to get updates about new releases or ask general questions.
* Find us [on gitter](https://gitter.im/getredash/redash#) (chat).
* Contact Arik, the maintainer directly: arik@redash.io.

## Reporting Bugs and Contributing Code

* Want to report a bug or request a feature? Please open [an issue](https://github.com/getredash/redash/issues/new).
* Want to help us build **_re:dash_**? Fork the project, edit in a [dev environment](http://docs.redash.io/en/latest/dev/vagrant.html), and make a pull request. We need all the help we can get!

## License

See [LICENSE](https://github.com/getredash/redash/blob/master/LICENSE) file.
