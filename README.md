# [_re:dash_](https://github.com/everythingme/re:dash)

**_re:dash_** is our take on freeing the data within our company in a way that will better fit our culture and usage patterns.

Prior to **_re:dash_**, we tried to use tranditional BI suites and discovered a set of bloated, technically challenged and slow tools/flows. What we were looking for was a more hacker'ish way to look at data, so we built one.

**_re:dash_** was built to allow fast and easy access to billions of records, that we process and collect using Amazon Redshift ("petabyte scale data warehouse" that "speaks" PostgreSQL).

**_re:dash_** consists of two parts:

1. **Query Editor**: think of [JS Fiddle](http://jsfiddle.net) for SQL queries. It's your way to share data in the organization in an open way, by sharing both the dataset and the query that generated it. This way everyone can peer review not only the resulting dataset but also the process that generated it. Also it's possible to fork it and generate new datasets and reach new insights. 
2. **Dashboards/Visualizations**: once you have a dataset, you can create different visualizations out of it, and then combine several visualizations into a single dashboard. Currently it supports bar charts, pivot table and cohorts.

This is the first release, which is more than usable but still has its rough edges and way to go to fulfill its full potential. The Query Editor part is quite solid, but the visualizations need more work to enrich them and to make them more user friendly.

## Technology

* [AngularJS](http://angularjs.org/)
* [Tornado](tornadoweb.org)
* [PostgreSQL](http://www.postgresql.org/) / [AWS Redshift](http://aws.amazon.com/redshift/)
* [Redis](http://redis.io)

PostgreSQL is used both as the operatinal database for the system, but also as the data store that is being queried. To be exact, we built this system to use on top of Amazon's Redshift, which supports the PG driver. But it's quite simple to add support for other datastores, and we do plan to do so.

This is our first large scale AngularJS project, and we learned a lot during the development of it. There are still things we need to iron out, and comments on the way we use AngularJS are more than welcome (and pull requests just as well).

### HighCharts

HighCharts is really great, but it's not free for commercial use. Please refer to their [licensing options](http://shop.highsoft.com/highcharts.html), to see what applies for your use. 

It's very likely that in the future we will switch to [D3.js](http://d3js.org/) instead.

## How to install

TBD.

## Roadmap

TBD.

## Reporting Bugs and Contributing Code

* Want to report a bug or request a feature? Please open [an issue](https://github.com/everythingme/redash/issues/new).
* Want to help us build **_re:dash_**? Fork the project and make a pull request. We need all the help we can get!

## License

See [LICENSE](https://github.com/EverythingMe/redash/blob/master/LICENSE) file.
