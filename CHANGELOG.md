# Change Log

## v4.0.0 - 2018-04-16

### Added

- MatterMost alert destination. @alon710
- Full screen view on map visualizations. @deecay
- Choropleth map visualization 🗺. @kravets-levko
- Report Celery queue size. @arikfr
- Load dashboard refresh rate from URL. @arikfr
- Configuration for query refresh intervals. @arikfr

### Changed

- TreasureData: improve query failure message. @toru-takahashi
- Update botocore version (fixes an issue with loading Athena tables). @arikfr
- Changed Map visualization name to "Map (Markers)" to distinguish from the Choropleth one. @arikfr
- Use MongoClient for ReplicaSet connections. @fmy
- Update pymongo version to support newer MongoDB versions. @arikfr
- Changed "his" to "their" in user creation form success message. @tnetennba3
- Show friendly names in dynamic forms labels. @arikfr
- Render safe HTML by default in tables to remain backward compatible. @arikfr
- Apply time limit to alert status checking task. @arikfr
- Plotly: increase Y value accuracy. @arikfr
- close metadata database connection early in the execute query Celery task. @arikfr

### Fixed

- Query page layout gets messed up when clicking on "cancel" in "Do you want to leave this page?" dialog. @kravets-levko
- docker-entrypoint broke for other database names than "postgres". @valentin2105
- (BigQuery) UDF URI was used even if empty. @arikfr
- Show correct Box Plot chart hover data. @deeccay
- Fork button shows in data only view, but not working. @arikfr
- Saving widget sends too much data to the server, sometimes making dashboard save fail. @arikfr
- DynamoDB: always return counter as a number rather than string. @arikfr
- MSSQL: UUID fields were detected as booleans. @arikfr
- The whole dashboard page reloads when clicking on refresh. @arikfr
- Line chart with category x-axis: when some values missing, wrong hints displayed on hover. @kravets-levko
- Second Y-axis not displayed when stacking enabled. @kravets-levko
- Widget with empty contents had extra 40px of white space (paddings of container). @kravets-levko
- Add scrollbars to pivot table widgets. @kravets-levko
- Multiple performance, usability and auto-height related fixes to the dashboard rendering engine (also switched to GridStack). @kravets-levko
- Login form missing on LDAP logging page. @idalin
- Empty state: show connect data source link only to admins. @arikfr
- Dashboard "dancing" widgets (when auto-height enabled). @kravets-levko

### Other

- Webpack: ignore vim swap files. @deecay

## v4.0.0-rc.1 - 2018-03-05

### Added

- Configuration for query refresh intervals.
- [Prometheus] Support for range queries. @jubel-han
- Extensions system based on Python entrypoints. @jezdez
- Funnel visualization. @tonyjiangh
- UI to edit allowed Google OAuth domains. @arikfr
- Empty state for homepage, alerts, queries and dashboards pages. @kocsmy, @arikfr

### Changed

- Maintain widget's auto-height state until it's been resized by the user. @kravets-levko
- Change default table viz width from 4 to 3 columns. @kravets-levko
- When saving dashboard adding or removing widgets, save only modified widgets (with changed size and/or position). @kravets-levko
- Don't allow disabling Password based login if no SSO is enabled. @arikfr
- Always show login page, even if password based login disabled. @arikfr
- Upgrade `sqlparse` to 0.2.4. @ariarijp
- Make sure datetime/number columns in table visualization don't wrap. @kravets-levko
- Explicitly set order of tabs in settings page. @kravets-levko
- User can no longer change the type of a saved visualization. @kravets-levko
- Update docker-compose.yml to restart postgres/redis containers `unless-stopped`. @benmanns
- New default colors for chart visualizations. @kocsmy
- Updated design of all the authentication pages (login, forgot password, etc). @kravets-levko

### Fixed

- Glue schemas with more than 100 tables were showing only first 100 tables. @jezdez
- Long visualizations dind't render scrollbars on some browsers. @kravets-levko
- When the dataset was returning some columns name as non strings, table couldn't be rendered. @kravets-levko
- Missing logos for Prometheus and Snowflake. @kocsmy
- Render correct link to LDAP login on login page. @arikfr
- Sort widgets by column/row to make sure they are placed correctly. @arikfr
- Public dashboards were not rendered due to Javascript error. @kravets-levko

## v4.0.0-beta - 2018-02-14

### Added

- Massive update to the UI/UX of the whole application. @kocsmy, @kravets-levko, @arikfr
- Flexible dashboard layout: resize widgets both vertically and horizonally. @kravets-levko
- Configuration and new options for the table visualization. @kravets-levko
- API to return internal usage events. @arikfr
- Add an option to set a common prefix to the backend logs. @arikfr
- [MongoDB] support nested fields in results. @arikfr
- Cohort visualization: add options and fix rendering logic. @kravets-levko
- Table visualization: `URL` column type. @kravets-levko
- Table visualization: `Image` column type. @kravets-levko
- [BigQuery] show amount of data scanned. @arikfr
- Make dashboard refresh intervals configurable. @arikfr
- Button to insert table/column name from schema into the query text. @kravets-levko
- [Athena] show amount of data scanned. @washort
- [Salesforce] Add setting to set the API version. @mayconbordin
- UI for configuration options (auth, date format, etc). @arikfr
- CLI command to create the root user. @kyoshidajp
- [Redshift] support for loading late binding views in schema browser. @tonyjiangh
- Show user's profile picture and load it from Google when using Google OAuth. @kyoshidajp
- CockroachDB query runner. @yershalom
- MAPD query runner. @cdessanti
- Pie chart: show subplot titles. @deecay

### Changed

- Make trusted header authentication compatible with multiorg mode. @sjakthol
- Update AWS RDS certificate bundle. @arikfr
- Add Prometheus to the default query runners list. @arikfr
- [Athena] update botocore version to support Glue. @arikfr
- Support for quotes passwords in the Redis and Postgres connection URLs. @javier-sanz
- Change the way static assets are served. @arikfr
- [BigQuery] Properly handle RECORD fields in schema (show the nested fields). @arikfr
- Upgrade to Celery 3.1.25 in preparation to Celery 4. @jezdez
- Remove loading indicator when updating query parameter value (before executing). @kravets-levko
- Improvements to the chart visualization (see #2156 for details). @kravets-levko
- Start searching for queries immediately instead of waiting for 3 characters. @kyoshidajp
- Make all references to Elasticsearch be properly capitalized. @kakakakakku
- Use PostgreSQL's FTS/tsvector type for query searches. @jezdez
- [Redshift] Make sslmode configurable. @sjakthol
- Allow passing options to tests Docker command. @arikfr
- Improve error handling mechanism and make error pages friendlier. @kravets-levko, @kocsmy, @arikfr
- Make LDAP settings names more consistent. @gramakri
- [Oracle] support for non SELECT queries. @doddjc21
- Admin can no longer remove themselves from the built-in groups. @negibouze
- Update pie charts font style. @deecay
- Upgrade psycopg2 for support PostgreSQL 10.0. @kyoshidajp
- Convert all stylesheets to LESS. @kravets-levko
- [Elasticsearch] Collect doc_count field from aggregation. @arjan
- Switch to pytest. @jezdez
- Ensure email is case-insensitive. @miketheman
- [Redshift] change default SSL mode to prefer. @arikfr
- Return Redis memory usage in bytes for easier monitoring. @kakakakakku
- create_db command in docker-entrypoint waits for Postgres to become available first. @ariarijp
- [Elasticsearch] set source_content_type on ES queries to support Elasticsearch 6.0. @alexdrans
- Show `-` instead of `Invalid Date` for null values given to `dateTime` filter. @kyoshidajp

### Fixed

- Parameters list was resetting when adding a new parameter. @arikfr
- Don't escape values in non-html columns. @kravets-levko
- Commit SAML user group assignment to the database. @sjakthol
- Update correct settings in SAML settings form. @sjakthol
- Fix Google OAuth login in MULTIORG mode. @shinji19
- Strip annotation from query when path is specified in Script query runner. @ariarijp
- Fix filter headers when there are multiple rows of filters. @kocsmy
- Update query version when changing query data source. @washort
- Fix upgrade script to support changes in CircleCI. @rgjodekerken
- Don't show error indicators after submitting the user form. @bamboo-yujiro
- [Query Results] support unicode column names. @tonyjiangh
- Issue with Google OAuth caused by old pyOpenSSL version. @crooy
- Fix layout of outdated queries admin view. @bamboo-yujiro
- User can't download query results of a new query. @arikfr
- Typo in celery logs format. @ariarijp
- Handling whitespace characters in Query Results data source. @ariarijp
- [MySQL] Close cursor when cancellig the query. @jasonsmithj


## v3.0.0 - 2017-11-13

### Added

- Query Result data source (run queries on query results).
- Athena: option to load schema from Glue catalog. @myouju
- Allow running any command inside the container via the Docker entrypoint script. @jezdez
- Make invitation token max age configurable. @hhamalai
- Redshift: add support for the new ACM root CA.
- Redshift: support for Spectrum (external) tables. @atharvai
- MongoDB: option to set allowDiskUse in queries.
- Option to disable SQLAlchemy connection pool.
- Option to set a time limit on adhoc queries.
- Option to disable sending an invite to a new user.
- Azure SQL Data Warehouse query runner. @kitsuyui
- Prometheus query runner. @yershalom
- Option to set the Flask-Limiter storage engine.
- Option to set UnicodeWriter's error handling method. @fan-t-endo
- PostgreSQL: SSL configuration option. @TylerBrock
- Counter visualization: additional formatting options. @deecay
- Query based drop down parameter. @rohithmenon
- MySQL: multiple queries support & connection timeout.
- Ability to select all in multi-filter. @Posnet
- LDAP (Active Directory) support. @amarjayr

### Changed

- Copy parameters when forking a query. @kyoshidajp
- Prevent using Query API Key with refresh API (previously it was just failing).
- Reduce boilerplate in frontend code.
- Set auto focus in first input items. @kyoshidajp
- Update gunicorn to latest version.
- Make log format configurable. 
- Sort series by name. 
- Allow setting test file with Docker test run. @meinac
- Use outdated queries count stored already in Redis.
- Show links based on permissions the user have. 
- Cassandra: update driver version. @yershalom
- Docker-Compose: update configuration to always restart services. @muddydixon
- Modernize Python 2 code to get ready for Python 3. @cclauss
- Cohort visualization: make it friendlier to use by better handle gaps in data, so it's easier to generate the data needed.
- Use a different markdown library. @alexmuller
- Salesforce: improve error messages we receive from the API. @akiray03
- Custom JS code visualization improvements. @deecay
- DQL: Update version to 0.5.24. @aterreno
- Cassandra: get_schema support for both C* 2.x and 3.x, support for SortedSet type serialization. (@mfouilleul)
- Replace deprecated ng-annotate with babel plugin. @44px
- Update Python dependencies to recent versions. @alison985
- Bootstrap script: create /opt/redash directory only if it doesn't exist. @isomura
- Bootstrap script: make use of REDASH_BASE_PATH variable in setup script. @sylvain

### Fixed

- Require full data source access to fork a query.
- API key of one query could be used to get results of another one.
- Delete group id from user object when deleting the group. @kyoshidajp
- Sorting of X axis wasn't working for Box plot type visualizations. @deecay
- Exporting query results as excel was failing when one of the columns had array data. @kyoshidajp
- Show query editor's Archive/Publish Query drop-down only on saved queries. @cyriac
- Move misplaced configuration in docker-compose.production.yml. @yutannihilation
- MySQL: support UTF8 schema.
- TreasureData queries were failing when returning 0 rows.
- Use series color for Boxplot. @deecay
- Revoke permission should respect to given grantee and access type. @meinac
- Fixed eslint "Cannot read property 'length' of undefined" error. @kravets-levko
- Don't crash query editor when there are unclosed curly brackets. 
- Error value in charts wasn't displayed if it was 0.
- Prevent line breaks in EditInPlace description when using Firefox. @alexmuller
- Queries#all_queries was sometimes returning wrong number of queries.
- record_event fails for API events.
- Cancel button on tasks admin page was broken.
- Remove deprecated cx_Oracle types. @queeno
- Textbox widgets were updating their value even when editor was cancelled. @alison985
- Collaborators couldn't edit visualizations or schedule.
- Use series color for error bar. @deecay
- Upgrade script was using the wrong restart command on new AMIs.

## v2.0.1 - 2017-10-22

This is a patch release, that adds support for Redshift ACM certificates (see #2044 for details).


## v2.0.0 - 2017-08-08

### Added

- [Cassandra] Support for UUID serializing and setting protocol version. @mfouilleul
- [BigQuery] Add maximumBillingTier to BigQuery configuration. @dotneet
- Add the propertyOrder field to specify order of data source settings. @rmakulov
- Add Plotly based Boxplot visualization. @deecay
- [Presto] Add: query cancellation support. @fbertsch
- [MongoDB] add $oids JSON extension.
- [PostgreSQL] support for loading materialized views in schema.
- [MySQL] Add option to hide SSL settings.
- [MySQL] support for RDS MySQL and SSL.
- [Google Analytics] support for mcf queries & better errors.
- Add: static enum parameter type. @rockwotj
- Add: option to hide pivot table controls. @deecay
- Retry reload of query results if it had an error.
- [Data Sources] Add: MemSQL query runner. @alexanderlz
- "Dumb" recents option (see #1779 for details)
- Athena: direct query runner using the instead of JDBC proxy. @laughingman7743
- Optionally support parameters in embeds. @ziahamza
- Sorting ability in alerts view.
- Option to change default encoding of CSV writer. @yamamanx
- Ability to set dashboard level filters from UI.
- CLI command to open IPython shell.
- Add link to query page from admin view. @miketheman
- Add the option to write logs to STDOUT instead of STDERR. @eyalzek
- Add limit parameter to tasks API. @alexpekurovsky
- Add SQLAlchemy pool settings.
- Support for category type y axis.
- Add 12 & 24 hours refresh rate option to dashboards.

### Changed

- Upgrade Google API client library for all Google data sources. @ahamino
- [JIRA JQL] change default max results limit from 50 to 1000. @jvanegmond
- Upgrade to newer Plotly version. @deecay
- [Athena] Configuration flag to disable query annotations for Athena. @suemoc
- Ignore extra columns in CSV output. @alexanderlz
- [TreasureData] improve error handling and upgrade client.
- [InfluxDB] simpler test connection query (show databases requires admin).
- [MSSQL] Mark integers as decimals as well, as sometimes decimal columns being returned
  with integer column type.
- [Google Spreadsheets] add timeout to requests.
- Sort dashboards list by name. @deecay
- Include Celery task name in statsd metrics.
- Don't include paused datasource's queries in outdated queries count.
- Cohort: handle the case where the value/total might be strings.
- Query results: better type guessing on the client side.
- Counter: support negative indexes to iterate from the end of the results.
- Data sources and destinations configuration: change order of name and type (type first now).
- Show API Key in a modal dialog instead of alert.
- Sentry: upgrade client version.
- Sentry: don't install logging hook.
- Split refresh schemas into separate tasks and add a timeout.
- Execute scheduled queries with parameters using their default value.
- Keep track of last query execution (including failed ones) for scheduling purposes.
- Same view for input on search result page as in header. @44px
- Metrics: report endpoints without dots for metrics.
- Redirect to / when org not found.
- Improve parameters label placement. @44px
- Auto-publish queries when they are named (with option to disable; #1830).
- Show friendly error message in case of duplicate data source name.
- Don't allow saving dashboard with empty name.
- Enable strict checking for Angular DI.
- Disable Angular debug info (should improve performance).
- Update to Webpack 2. @44px
- Remove /forgot endpoint if REDASH_PASSWORD_LOGIN_ENABLED is false. @amarjayr
- Docker: make Gunicorn worker count configurable. @unixwitch
- Snowflake support is no longer enabled by default.
- Enable memory optimization for Excel exporter.

### Fixed

- Fix: set default values in options to enable 'default: True' for checkbox. @rmakulov
- Support MULTI_ORG again.
- [Google Spreadsheets] handle distant future dates.
- [SQLite] better handle utf-8 error messages.
- Fix: don't remove locks for queries with task status of PENDING.
- Only split columns with __/:: that end with filter/MultiFilter.
- Alert notifications fail (sometime) with a SQLAlchemy error.
- Safeguard against empty query results when checking alert status. @danielerapati
- Delete data source doesn't work when query results referenced by queries.
- Fix redirect to /setup on the last setup step. @44px
- Cassandra: use port setting in connection options. @yershalom
- Metrics: table name wasn't found for count queries.
- BigQuery wasn't loading due to bad import.
- DynamicForm component was inserting empty values.
- Clear null values from data source options dictionary.
- /api/session API call wasn't working when multi tenancy enabled
- If column had no type it would use previous column's type.
- Alert destination details were not updating.
- When setting rearm on a new alert, it wasn't persisted.
- Salesforce: sandbox parameter should be optional. @msnider
- Alert page wasn't properly linked from alerts list. @alison985
- PostgreSQL passwords with spaces were not supported. (#1056)
- PivotTable wasn't updating after first save.


## v1.0.3 - 2017-04-18

### Fixed

- Fix: sort by column no longer working.

## v1.0.2 - 2017-04-18

### Fixed

- Fix: favicon wasn't showing up.
- Fix: support for unicode in dashboard tags. @deecay
- Fix: page freezes when rendering large result set.
- Fix: chart embeds were not rendering in PhantomJS.

## v1.0.1 - 2017-04-02

### Added

- Add: bubble charts support.
- Add "Refresh Schema" button to the datasource @44px
- [Data Sources] Add: ATSD query runner @rmakulov
- [Data Sources] Add: SalesForce query runner @msnider
- Add: scheduled query backoff in case of errors @washort
- Add: use results row count as the value for the counter visualization. @deecay

### Changed

- Moved CSV/Excel query results generation code to models. @akiray03
- Add support for filtered data in Pivot table visualization @deecay
- Friendlier labels for archived state of dashboard/query

### Fixed

- Fix: optimize queries to avoid N+1 queries.
- Fix: percent stacking math was wrong. @spasovski
- Fix: set query filter to match value from URL query string. @benmargo
- [Clickhouse] Fix: detection of various data types. @denisov-vlad
- Fix: user can't edit their own alert.
- Fix: angular minification issue in textbox editor and schema browser.
- Fixes to better support IE11 (add polyfill for Object.assign and show vertical scrollbar). @deecay
- Fix: datetime parameters were not using a date picker.
- Fix: Impala schema wasn't loading.
- Fix: query embed dialog close button wasn't working @r0fls
- Fix: make errors from Presto runner JSON-serializable @washort
- Fix: race condition in query task status reporting @washort
- Fix: remove $$hashKey from Pivot table
- Fix: map visualization had severe performance issue.
- Fix: pemrission dialog wasn't rendering.
- Fix: word cloud visualization didn't show column names.
- Fix: wrong timestamps in admin tasks page.
- Fix: page header wasn't updating on dashboards page @MichaelJAndy
- Fix: keyboard shortcuts didn't work in parameter inputs

### Other

- Change default job expiry times to: job lock expire after 12 hours (previously: 6 hours) and Celery task result object expire after 4 hours (previously: 1 hour). @shimpeko

## v1.0.0-rc.2 - 2017-02-22

### Changed

- [#1563](https://github.com/getredash/redash/pull/1563) Send events to webhook as JSON with a schema.
- [#1601] [Presto] friendlier error messages. (@aslotnick)
- Move the query runner unavailable log message to be DEBUG level instead of WARNING, as it was mainly confusing people.
- Remove "Send to Cloud" button from Plotly based visualizations.
- Change Plotly's default hover mode to "Compare".
- [#1612] Change: Improvements to the dashboards list page.

### Fixed

- [#1564] Fix: map visualization column picker wasn't populated. (@janusd)
- [#1597] [SQL Server] Fix: schema wasn't loading on case sensitive servers. (@deecay)
- Fix: dashbonard owner couldn't edit his dashboard.
- Fix: toggle_publish event wasn't logged properly.
- Fix: events with API keys were not logged.
- Fix: share dashboard dialog was broken after code minification.
- Fix: public dashboard endpoint was broken.
- Fix: public dashboard page was broken after code minification.
- Fix: visualization embed page was broken after code minification.
- Fix: schema browser has dark background.
- Fix: Google button missing on invite page.
- Fix: global parameters don't render on dashboards with text boxes.
- Fix: sunburst / Sankey visualizations have bad data.
- Fix: extra whitespace created by the filters component.
- Fix: query results cleanup task was trying to delete query objects.
- Fix: alert subscriptions were not triggered.
- [DynamoDB] Fix: count(*) queries were broken. (@kopanitsa)
- Fix: Redash is using too many database connections.
- Fix: download links were not working in dashboards.
- Fix: the first selection in multi filters was broken in dashboards.

### Other

- [#1555] Change sourcemaps to generate a sourcemap per module. (@44px)
- [#1570] Fix Docker Compose configuration for nginx. (@btmc)
- [#1582] Update Dockerfile to build frontend assets and update the folder ownership.
- Dockerfile: change the uid of the redash user to match host user uid.
- Update npm-shrinkwrap.json file to use http proctocol instead of git. (@deecay)

## v1.0.0-rc.1 - 2017-01-31

This version has two big changes behind the scenes:

* Refactor the frontend to use latest (at the time) Angular version (1.5) along with better frontend pipeline based on
  WebPack.
* Refactor the backend code to use SQLAlchemy and Alembic, for easier migrations/upgrades.

Along with that we have many fixes, additions, new data sources (Google Analytics, ClickHouse, Amazon Athena, Snowflake)
and fixes to the existing ones (mainly ElasticSearch and Cassandra).

When upgrading make sure to upgrade from version 0.12.0 and update your .env file:

1. If you have local PostreSQL database, you will need to update the URL from `postgresql://redash` to `postgresql:///redash`.
2. Remove the `REDASH_STATIC_ASSETS_PATH` definition.

Make sure to make these changes before running upgrade as otherwise it will fail.

We're releasing a new upgrade script -- see [here](https://redash.io/help-onpremise/maintenance/how-to-upgrade-redash.html) for details.

### Added

- [#1546](https://github.com/getredash/redash/pull/1546) Add: API docstrings (@washort)
- [#1504](https://github.com/getredash/redash/pull/1504) Add: global parameters for dashboards (Tyler Rockwood)
- [#1508](https://github.com/getredash/redash/pull/1508) [Jira JQL] Add: support custom JIRA fields and enhance value mapping (@sseifert)
- [#1530](https://github.com/getredash/redash/pull/1530) Add: Docker based developer workflow (Arik Fraimovich)
- [#1515](https://github.com/getredash/redash/pull/1515) [Python] Add: get_source_schema method (Vladislav Denisov)
- [#1512](https://github.com/getredash/redash/pull/1512) [Python] Add: define more safe_builtins (Vladislav Denisov)
- [#1513](https://github.com/getredash/redash/pull/1513) Add: get_by_id & get_by_name methods for Query and DataSource classes (Vladislav Denisov)
- [#1482](https://github.com/getredash/redash/pull/1482) [Cassandra] Add: schema browser support & explicit protocol version (@yershalom)
- [#1488](https://github.com/getredash/redash/pull/1488) [Data Sources] Add: Snowflake query runner (@arikfr)
- [#1479](https://github.com/getredash/redash/pull/1479) [ElasticSearch] Add: enable schema browser (@adamlwgriffiths)
- [#1475](https://github.com/getredash/redash/pull/1475) [Cassnadra] Added set_keyspace for easier query cassandra (@yershalom)
- [#1468](https://github.com/getredash/redash/pull/1468) [Datasources] Add: Amazon Athena query runner (@arikfr)
- [#1433](https://github.com/getredash/redash/pull/1433) [Charts] Add: errors bands in graphs (@luke14free)
- [#1405](https://github.com/getredash/redash/pull/1405) [Datasources] Add: simple Google Analytics query runner (@denisov-vlad)
- [#1409](https://github.com/getredash/redash/pull/1409) [Datasources] Add: Add query runner for Yandex ClickHouse (@denisov-vlad)
- [#1373](https://github.com/getredash/redash/pull/1373) Add: rate limit the login page (@AntoineAugusti)

### Changed

- [#1549](https://github.com/getredash/redash/pull/1549) Change: disable version counter for queries: (Arik Fraimovich)
- [#1548](https://github.com/getredash/redash/pull/1548) Change: improve UI in small resolution: (Arik Fraimovich)
- [#1547](https://github.com/getredash/redash/pull/1547) Change: Improve drafts UX (Arik Fraimovich)
- [#1540](https://github.com/getredash/redash/pull/1540) [MySQL] Change: faster retrieval of schema (Yaning Zhu)
- [#1517](https://github.com/getredash/redash/pull/1517) [ClickHouse] Change: convert UInt64 columns to integer type (Vladislav Denisov)
- [#1528](https://github.com/getredash/redash/pull/1528) [Vertica] Change: set longer read_timeout (lab79)
- [#1522](https://github.com/getredash/redash/pull/1522) Change: move package.json/webpack.config to root directory (Arik Fraimovich)
- [#1514](https://github.com/getredash/redash/pull/1514) [Athena] Change: enable query annotations (Gaurav Awadhwal)
- [#1525](https://github.com/getredash/redash/pull/1525) Change: update amazon linux bootstrap.sh (Karri Niemelä)
- [#1509](https://github.com/getredash/redash/pull/1509) [Presto/Athena] Change: remove special rule around public schema (@GAwadhwalAtlassian)
- [#1485](https://github.com/getredash/redash/pull/1485) Close #1453: more minimal notification of draft status for query/dashboard (@arikfr)
- [#1474](https://github.com/getredash/redash/pull/1474) [Cassandra] Change: test connection query (@yershalom)
- [#1464](https://github.com/getredash/redash/pull/1464) [Clickhouse] Change: use UTF-8 encoding for POST data (@jaykelin)
- [#1417](https://github.com/getredash/redash/pull/1417) Change: Replace Peewee with SQLAlchemy/Alembic (@arikfr, @washort)
- [#1458](https://github.com/getredash/redash/pull/1458) Change: switch from flask_script to click, add CLI unit tests and upgrade Flask version (@washort)
- [#1438](https://github.com/getredash/redash/pull/1438) [ElasticSearch] Change: use simplejson for better error descriptions (@adamlwgriffiths)
- [#1435](https://github.com/getredash/redash/pull/1435) Whitelisting more builtin primitives (@mattrobenolt)
- [#1376](https://github.com/getredash/redash/pull/1376) Change: upgrade the frontend stack (@arikfr, @luke14free)
- [#1429](https://github.com/getredash/redash/pull/1429) Add missing error check from #1402 (@adamlwgriffiths)
- [#1256](https://github.com/getredash/redash/pull/1256) Change: when forking a query, copy all visualizations (@ninneko)
- [#1421](https://github.com/getredash/redash/pull/1421) Change: [BigQuery] only specify useLegacySQL is it's True (@arikfr)
- [#1353](https://github.com/getredash/redash/pull/1353) Change: make draft status for queries and dashboards toggleable (@washort)
- [#1419](https://github.com/getredash/redash/pull/1419) Change: use redash.utils.json_dumps instead of json.dumps in Python query runner (@ehfeng)
- [#1402](https://github.com/getredash/redash/pull/1402) Change: correctly propagate ElasticSearch errors to the UI (@adamlwgriffiths)
- [#1371](https://github.com/getredash/redash/pull/1371) Change: display user's password reset link to the admin when mail server disabled (@vitorbaptista)

### Fixed

- [#1551](https://github.com/getredash/redash/pull/1551) Fix: flask-admin - exclude created_at/updated_at so models can be saved (Arik Fraimovich)
- [#1545](https://github.com/getredash/redash/pull/1545) [ElasticSearch] Fix: query fails when properties key is missing (hgs847825)
- [#1526](https://github.com/getredash/redash/pull/1526) [ElasticSearch] Fix for #1521 (Adam Griffiths)
- [#1521](https://github.com/getredash/redash/pull/1521) [ElasticSearch] Fix: wrong variable name. (Arik Fraimovich)
- [#1497](https://github.com/getredash/redash/pull/1497) Fix #16: when updating dashboard name refresh dashboards dropdown (@arikfr)
- [#1491](https://github.com/getredash/redash/pull/1491) Fix: DynamoDB test connection was broken (@arikfr)
- [#1487](https://github.com/getredash/redash/pull/1487) Fix #1432: delete visualization sends full visualization body instead‚Ä¶ (@arikfr)
- [#1484](https://github.com/getredash/redash/pull/1484) Fix #1457: sort was using the string value (@arikfr)
- [#1478](https://github.com/getredash/redash/pull/1478) [ElasticSearch] Fix: connection test was always succesfful (@adamlwgriffiths)
- [#1440](https://github.com/getredash/redash/pull/1440) Fix: API errors for dashboards with invalid layout data (@whummer)
- [#1427](https://github.com/getredash/redash/pull/1427) [Cassandra] Fix: remove reference to non existing Error class (@arikfr)
- [#1423](https://github.com/getredash/redash/pull/1423) [Cassandra] Fix: cassandra.cluster.Error wasn't imported (@arikfr)
- Fix #1001: queries with a column named "length" were not rendered.
- Fix #578: dashboard list not scrollable.
- Fix #137: add direction indicators when sorting query results.

## v0.12.0 - 2016-11-20

### Added

- 61fe16e #1374: Add: allow '*' in REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN (Allen Short)
- 2f09043 #1113: Add: share modify/access permissions for queries and dashboard (whummer)
- 3db0eea #1341: Add: support for specifying SAML nameid-format (zoetrope)
- b0ecd0e #1343: Add: support for local SAML metadata file (zoetrope)
- 0235d37 #1335: Add: allow changing alert email subject. (Arik Fraimovich)
- 2135dfd #1333: Add: control over y axis min/max values (Arik Fraimovich)
- 49e788a #1328: Add: support for snapshot generation service (Arik Fraimovich)
- 229ca6c #1323: Add: collect runtime metrics for Celery tasks (Arik Fraimovich)
- 931a1f3 #1315: Add: support for loading BigQuery schema (Arik Fraimovich)
- 39b4f9a #1314: Add: support MongoDB SSL connections (Arik Fraimovich)
- ca1ca9b #1312: Add: additional configuration for Celery jobs (Arik Fraimovich)
- fc00e61 #1310: Add: support for date/time with seconds parameters (Arik Fraimovich)
- d72a198 #1307: Add: API to force refresh data source schema (Arik Fraimovich)
- beb89ec #1305: Add: UI to edit dashboard text box widget (Kazuhito Hokamura)
- 808fdd4 #1298: Add: JIRA (JQL) query runner (Arik Fraimovich)
- ff9e844 #1280: Add: configuration flag to disable scheduled queries (Hirotaka Suzuki)
- ef4699a #1269: Add: Google Drive federated tables support in BigQuery query runner (Kurt Gooden)
- 2eeb947 #1236: Add: query runner for Cassandra and ScyllaDB (syerushalmy)
- 10b398e #1249: Add: override slack webhook parameters (mystelynx)
- 2b5e340 #1252: Add: Schema loading support for Presto query runner (using information_schema) (Rohan Dhupelia)
- 2aaf5dd #1250: Add: query snippets feature (Arik Fraimovich)
- 8d8af73 #1226: Add: Sankey visualization (Arik Fraimovich)
- a02edda #1222: Add: additional results format for sunburst visualization (Arik Fraimovich)
- 0e70188 #1213: Add: new sunburst sequence visualization (Arik Fraimovich)
- 9a6d2d7 #1204: Add: show views in schema browser for Vertica data sources (Matthew Carter)
- 600afa5 #1138: Add: ability to register user defined function (UDF) resources for BigQuery DataSource/Query (fabito)
- b410410 #1166: Add: "every 14 days" refresh option (Arik Fraimovich)
- 906365f #967: Add: extend ElasticSearch query_runner to support aggregations (lloydw)

### Changed

- 2de4aa2 #1395: Change: switch to requests in URL query runner (Arik Fraimovich)
- db1a941 #1392: Change: Update documentation links to point at the new location. (Arik Fraimovich)
- 002f794 #1368: Change: added ability to disable auto update in admin views (Arik Fraimovich)
- aa5d14e #1366: Change: improve error message for exception in the Python query runner (deecay)
- 880627c #1355: Change: pass the user object to the run_query method (Arik Fraimovich)
- 23c605b #1342: SAML: specify entity id (zoetrope)
- 015b1dc #1334: Change: allow specifying recipient address when sending email test message (Arik Fraimovich)
- 39aaa2f #1292: Change: improvements to map visualization (Arik Fraimovich)
- b22191b #1332: Change: upgrade Python packages (Arik Fraimovich)
- 23ba98b #1331: Celery: Upgrade Celery to more recent version. (Arik Fraimovich)
- 3283116 #1330: Change: upgrade Requests to latest version. (Arik Fraimovich)
- 39091e0 #1324: Change: add more logging and information for refresh schemas task (Arik Fraimovich)
- 462faea #1316: Change: remove deprecated settings (Arik Fraimovich)
- 73e1837 #1313: Change: more flexible column width calculation (Arik Fraimovich)
- e8eb840 #1279: Change: update bootstrap.sh to support Ubuntu 16.04 (IllusiveMilkman)
- 8cf0252 #1262: Change: upgrade Plot.ly version and switch to smaller build (Arik Fraimovich)
- 0b79fb8 #1306: Change: paginate queries page & add explicit urls. (Arik Fraimovich)
- 41f99f5 #1299: Change: send Content-Type header (application/json) in query results responses (Tsuyoshi Tatsukawa)
- dfb1a20 #1297: Change: update Slack configuration titles. (Arik Fraimovich)
- 8c1056c #1294: Change: don't annotate BigQuery queries (Arik Fraimovich)
- a3cf92e #1289: Change: use key_as_string when available (ElasticSearch query runner) (Arik Fraimovich)
- e155191 #1285: Change: do not display Oracle tablespace name in schema browser (Matthew Carter)
- 6cbc39c #1282: Change: deduplicate Google Spreadsheet columns (Arik Fraimovich)
- 4caf2e3 #1277: Set specific version of cryptography lib (Arik Fraimovich)
- d22f0d4 #1216: Change: bootstrap.sh - use non interactive dist-upgrade (Atsushi Sasaki)
- 19530f4 #1245: Change: switch from CodeMirror to Ace editor (Arik Fraimovich)
- dfb92db #1234: Change: MongoDB query runner set DB name as mandatory (Arik Fraimovich)
- b750843 #1230: Change: annotate Presto queries with metadata (Noriaki Katayama)
- 5b20fe2 #1217: Change: install libffi-dev for Cryptography (Ubuntu setup script) (Atsushi Sasaki)
- a9fac34 #1206: Change: update pymssql version to 2.1.3 (kitsuyui)
- 5d43cbe #1198: Change: add support for Standard SQL in BigQuery query runner (mystelynx)
- 84d0c22 #1193: Change: modify the argument order of moment.add function call (Kenya Yamaguchi)


### Fixed

- d6febb0 #1375: Fix: Download Dataset does not work when not logged in (Joshua Dechant)
- 96553ad #1369: Fix: missing format call in Elasticsearch test method (Adam Griffiths)
- c57c765 #1365: Fix: compare retrieval times in UTC timezone (Allen Short)
- 37dff5f #1360: Fix: connection test was broken for MySQL (ichihara)
- 360028c #1359: Fix: schema loading query for Hive was wrong for non default schema (laughingman7743)
- 7ee41d4 #1358: Fix: make sure all calls to run_query updated with new parameter (Arik Fraimovich)
- 0d94479 #1329: Fix: Redis memory leak. (Arik Fraimovich)
- 7145aa2 #1325: Fix: queries API was doing N+1 queries in most cases (Arik Fraimovich)
- cd2e927 #1311: Fix: BoxPlot visualization wasn't rendering on a dashboard (Arik Fraimovich)
- a562ce7 #1309: Fix: properly render checkboxes in dynamic forms (Arik Fraimovich)
- d48192c #1308: Fix: support for Unicode columns name in Google Spreadsheets (Arik Fraimovich)
- e42f93f #1283: Fix: schema browser was unstable after opening a table (Arik Fraimovich)
- 170bd65 #1272: Fix: TreasureData get_schema method was returning array instead of string as column name (ariarijp)
- 4710c41 #1265: Fix: refresh modal not working for unsaved query (Arik Fraimovich)
- bc3a5ab #1264: Fix: dashboard refresh not working (Arik Fraimovich)
- 6202d09 #1240: Fix: when shared dashboard token not found, return 404 (Wesley Batista)
- 93aac14 #1251: Fix: autocomplete went crazy when database has no autocomplete. (Arik Fraimovich)
- b8eca28 #1246: Fix: support large schemas in schema browser (Arik Fraimovich)
- b781003 #1223: Fix: Alert: when hipchat Alert.name is multibyte character, occur error. (toyama0919)
- 0b928e6 #1227: Fix: Bower install fails in vagrant (Kazuhito Hokamura)
- a411af2 #1232: Fix: don't show warning when query string (parameters value) changes (Kazuhito Hokamura)
- 3dbb5a6 #1221: Fix: sunburst didn't handle all cases of path lengths (Arik Fraimovich)
- a7cc1ee #1218: Fix: updated result not being saved when changing query text. (Arik Fraimovich)
- 0617833 #1215: Fix: email alerts not working (Arik Fraimovich)
- 78f65b1 #1187: Fix: read only users receive the permission error modal in query view (Arik Fraimovich)
- bba801f #1167: Fix the version of setuptools on bootstrap script for Ubuntu (Takuya Arita)
- ce81d69 #1160: Fix indentation in docker-compose-example.yml (Hirofumi Wakasugi)
- dd759fe #1155: Fix: make all configuration values of Oracle required (Arik Fraimovich)

### Docs

- a69ee0c #1225: Fix: RST formatting of the Vagrant documentation (Kazuhito Hokamura)
- 03837c0 #1242: Docs: add warning re. quotes on column names and BigQuery (Ereli)
- 9a98075 #1255: Docs: add documentation for InfluxDB (vishesh92)
- e0485de #1195: Docs: fix typo in maintenance page title (Antoine Augusti)
- 7681d3e #1164: Docs: update permission documentation (Daniel Darabos)
- bcd3670 #1156: Docs: add SSL parameters to nginx configuration (Josh Cox)

## v0.11.1.b2095 - 2016-08-02

This is a hotfix release, which fixes an issue with email alerts in v0.11.0.

## v0.11.0.b2016 - 2016-07-03

The main features of this release are:

- Alert Destinations: ability to define multiple destinations for alert notifications (currently implemented: HipChat, Slack, Webhook and email).
- The long-awaited UI for query parameters (see example in #1069).

Also, this release includes numerous smaller features, improvements, and bug fixes.

A big thank you goes to all who contributed code and documentation in this release: @AntoineAugusti, @James226, @adamlwgriffiths, @alexdebrie, @anthony-coble, @ariarijp, @dheerajrav, @edwardsharp, @machira, @nabilblk, @ninneko, @ordd, @tomerben,  @toru-takahashi, @vishesh92, @vorakumar and @whummer.

### Added

- d5e5b24 #1136: Feature: add --org option to all relevant CLI commands. (@adamlwgriffiths)
- 87e25f2 #1129: Feature: support for JSON query formatting (Mongo, ElasticSearch) (@arikfr)
- 6bb2716 #1121: Show error when failing to communicate with server (@arikfr)
- f21276e #1119: Feature: add UI to delete alerts (@arikfr)
- 8656540 #1069: Feature: UI for query parameters (@arikfr)
- 790128c #1067: Feature: word cloud visualization (@anthony-coble)
- 8b73a2b #1098: Feature: UI for alert destinations & new destination types (@alexdebrie)
- 1fbeb5d #1092: Add Heroku support (@adamlwgriffiths)
- f64622d #1089: Add support for serialising UUID type within MSSQL #961 (@James226)
- 857caab #1085: Feature: API to pause a data source (@arikfr)
- 214aa3b #1060: Feature: support configuring user's groups with SAML (@vorakumar)
- e20a005 #1007: Issue#1006:  Make bottom margin editable for Chart visualization (@vorakumar)
- 6e0dd2b #1063: Add support for date/time Y axis (@tomerben)
- b5a4a6b #979: Feature: Add CLI to edit group permissions (@ninneko)
- 6d495d2 #1014: Add server-side parameter handling for embeds (@whummer)
- 5255804 #1091: Add caching for queries used in embeds (@whummer)

### Changed

- 0314313 #1149: Presto QueryRunner supports tinyint and smallint (@toru-takahashi)
- 8fa6fdb #1030: Make sure data sources list ordered by id (@arikfr)
- 8df822e #1141: Make create data source button more prominent (@arikfr)
- 96dd811 #1127: Mark basic_auth_password as secret (@adamlwgriffiths)
- ad65391 #1130: Improve Slack notification style (@AntoineAugusti)
- df637e3 #1116: Return meaningful error when there is no cached result. (@arikfr)
- 65635ec #1102: Switch to HipChat V2 API (@arikfr)
- 14fcf01 #1072: Remove counter from the tasks Done tab (as it always shows 50). #1047 (@arikfr)
- 1a1160e #1062: DynamoDB: Better exception handling (@arikfr)
- ed45dcb #1044: Improve vagrant flow (@staritza)
- 8b5dc8e #1036: Add optional block for more scripts in template (@arikfr)

### Fixed

- dbd48e1 #1143: Fix: use the email input type where needed (@ariarijp)
- 7445972 #1142: Fix: dates in filters might be duplicated (@arikfr)
- 5d0ed02 #1140: Fix: Hive should use the enabled variable (@arikfr)
- 392627d #1139: Fix: Impala data source referencing wrong variable (@arikfr)
- c5bfbba #1133: Fix: query scrolling issues (@vishesh92)
- c01d266 #1128: Fix: visualization options not updating after changing type (@arikfr)
- 6bc0e7a #1126: Fix #669: save fails when doing partial save of new query (@arikfr)
- 3ce27b9 #1118: Fix: remove alerts for archived queries (@arikfr)
- 4fabaae #1117: Fix #1052: filter not working for date/time values (@arikfr)
- c107c94 #1077: Fix: install needed dependencies to use Hive in Docker image (@nabilblk)
- abc790c #1115: Fix: allow non integers in alert reference value (@arikfr)
- 4ec473c #1110: Fix #1109: mixed group permissions resulting in wrong permission (@arikfr)
- 1ca5262 #1099: Fix RST syntax for links (@adamlwgriffiths)
- daa6c1c #1096: Fix typo in env variable VERSION_CHECK (@AntoineAugusti)
- cd06d27 #1095: Fix: use create_query permission for new query button. (@ordd)
- 2bc0b27 #1061: Fix: area chart stacking doesn't work (@machira)
- 8c21e91 #1108: Remove potnetially concurrency not safe code form enqueue_query (@arikfr)
- e831218 #1084: Fix #1049: duplicate alerts when data source belongs to multiple groups (@arikfr)
- 6edb0ca #1080: Fix typo (@jeffwidman)
- 64d7538 #1074: Fix: ElasticSearch wasn't using correct type names (@toyama0919)
- 3f90dd9 #1064: Fix: old task trackers were not really removed (@arikfr)
- e10ecd2 #1058: Bring back filters if dashboard filters are enabled (@AntoineAugusti)
- 701035f #1059: Fix: DynamoDB having issues when setting host (@arikfr)
- 2924d4f #1040: Small fixes to visualizations view (@arikfr)
- fec0d5f #1037: Fix: multi filter wasn't working with __ syntax (@dheerajrav)
- b066ce4 #1033: Fix: only ask for notification permissions if wasn't denied (@arikfr)
- 960c416 #1032: Fix: make sure we return dashboards only for current org only (@arikfr)
- b3844d3 #1029: Hive: close connection only if it exists (@arikfr)

### Docs

- 6bb09d8 #1146: Docs: add a link to settings documentation. (@adamlwgriffiths)
- 095e759 #1103: Docs: add section about monitoring (@AntoineAugusti)
- e942486 #1090: Contributing Guide (@arikfr)
- 3037c4f #1066: Docs: command type-o fix. (@edwardsharp)
- 2ee0065 #1038: Add an ISSUE_TEMPLATE.md to direct people at the forum (@arikfr)
- f7322a4 #1021: Vagrant docs: add purging the cache step (@ariarijp)

---

For older releases check the GitHub releases page:
https://github.com/getredash/redash/releases
