**_re:dash_** is our take on freeing the data within our company in a way that will better fit our culture and usage patterns.

Prior to **_re:dash_**, we tried to use traditional BI suites and discovered a set of bloated, technically challenged and slow tools/flows. What we were looking for was a more hacker'ish way to look at data, so we built one.

**_re:dash_** was built to allow fast and easy access to billions of records, that we process and collect using Amazon Redshift ("petabyte scale data warehouse" that "speaks" PostgreSQL).
Today **_re:dash_** has support for querying multiple databases, including: Redshift, Google BigQuery, PostgreSQL, MySQL, Graphite and custom scripts.

### Features

1. **Query Editor**: think of [JS Fiddle](http://jsfiddle.net) for SQL queries. It's your way to share data in the organization in an open way, by sharing both the dataset and the query that generated it. This way everyone can peer review not only the resulting dataset but also the process that generated it.
2. **Visualizations**: once you have a dataset, you can create different visualizations out of it. Currently it supports charts, pivot table and cohorts.
3. **Dashboards**: combine several visualizations into a single dashboard.

### Demo

![Screenshots](https://raw.github.com/EverythingMe/redash/screenshots/screenshots.gif)

You can try out the demo instance: [http://demo.redash.io/](http://demo.redash.io/) (login with any Google account).

### Users

<center>
    <table class="production">
        <tr>
            <td align="center"><a href="http://everything.me"><img src="{{ site.baseurl }}/static/img/evme_logo.png" width="84"/></a></td>
            <td align="center"><a href="http://yallo.com"><img src="{{ site.baseurl }}/static/img/yallo_logo.png" width="84"/></a></td>
            <td align="center"><a href="http://bringg.com"><img src="{{ site.baseurl }}/static/img/bringg_logo.png" width="84"/></a></td>
            <td align="center"><a href="http://nextpeer.com"><img src="{{ site.baseurl }}/static/img/nextpeer_logo.png" width="84"/></a></td>
            <td align="center"><a href="http://http://www.ravellosystems.com/"><img src="{{ site.baseurl }}/static/img/ravello_logo.svg" width="140"/></a></td>
        </tr>
    </table>
</center>

### Getting Started

[Setting up re:dash instance]({% post_url 2015-02-18-setup %}) (includes links to ready made AWS/GCE images).

### Getting Help

* Source: https://github.com/everythingme/redash
* Issues: https://github.com/everythingme/redash/issues
* Mailing List: redash-users@googlegroups.com
* Gitter (chat): https://gitter.im/EverythingMe/redash
* Contact Arik, the maintainer directly: arik@everything.me.

### Contributing
**_re:dash_** has a growing community and contributions are always welcome (particularly documentation). To contribute, fork the project on GitHub and send a pull request.
