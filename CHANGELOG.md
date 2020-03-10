# Change Log

## v8.0.0 - 2019-10-27

There were no changes in this release since `v8.0.0-beta.2`. This is just to mark a stable release.

## v8.0.0-beta.2 - 2019-09-16

This is an update to the previous beta release, which includes:

* Add options for users to share anonymous usage information with us (see [docs](https://redash.io/help/open-source/admin-guide/usage-data) for details).
* Visualizations:
    - Allow the user to decide how to handle null values in charts.
* Upgrade Sentry-SDK to latest version.
* Make horizontal table scroll visible in dashboard widgets without scrolling.
* Data Sources:
    * Add support for Azure Data Explorer (Kusto).
    * MySQL: fix connections without SSL configuration failing.
    * Amazon Redshift: option to set query group for adhoc/scheduled queries.
    * Hive: make error message more friendly.
    * Qubole: add support to run Quantum queries.
* Display data source icon in query editor.
* Fix: allow users with view only acces to use the queries in Query Results
* Dashboard: when updating parameters refersh only widgets that use those parameters.

This release had contributions from 12 people: @arikfr, @cclauss, @gabrieldutra, @justinclift, @kravets-levko, @ranbena, @rauchy, @sandeepV2, @shinsuke-nara, @spacentropy, @sphenlee, @swfz.


## v8.0.0-beta - 2019-08-18

After months of being heads down with hard work, it's finally time to wrap up the V8 release 🤩 This release includes many long awaited improvements to parameters, UX improvements, further React migration and other changes, fixes and improvements.

While this version is already running on the hosted platform to make sure it's stable, we're excited to put this in the hands of our Open Source users.

Starting from this release we will no longer build a tarball distribution of the codebase and recommend everyone to switch over to using our Docker images. We're planning on dropping Python 2 support towards its EOL this year and switching over to the Docker image will make this transition much simpler.

This release was made possible by contributions from over 40 people: @aidarbek, @AntonZarutsky, @ariarijp, @arikfr, @combineads, @deecay, @fmy, @gabrieldutra, @guwenqing, @guyco33, @ialeinikov, @Jakdaw, @jezdez, @justinclift, @k-tomoyasu, @katty0324, @koooge, @kravets-levko, @ktmud, @KumanoTanaka, @kyoshidajp, @nason, @oldPadavan, @openjck, @osule, @otsaloma, @ranbena, @rauchy, @rueian, @sekiyama58, @shinsuke-nara, @taminif, @The-Alchemist, @vv-p, @washort, @wudi-ayuan, @ygrishaev, @yoavbls, @yoshiken, @yusukegoto and the support of over 500 organizations who subscribed to our hosted version and by that sponsor the team's work.

### Parameters

- Parameter UI improvements:
    - Support for multi-select in dropdown (and query dropdown) parameters.
    - Support for dynamic values in date and date-range parameters.
    - Search dropdown parameter values.
    - New UX for applying parameter changes in queries and dashboards.
- Allow using Safe Parameters in visualization embeds and public dashboards. Safe Parameters are any parameter type except for the a text parameter (dropdowns are safe).

### Data Sources

- New Data Sources: Couchbase, Phoenix and Dgraph.
- New JSON data source (and deprecated old URL data source).
- Snowflake: update connector to latest version.
- PostgreSQL: show only accessible tables in schema.
- BigQuery:
    - Correctly handle NaN values.
    - Treat repeated fields as rrays.
    - [BigQuery] Fix: in some queries there is no mode field
- DynamoDB:
    - Support for Unicode in queries.
    - Safe loading of schema.
- Rockset: better handling of query errors.
- Google Sheets:
    - Support for Team Drive.
    - Friendlier error message in case of an API error and more reliable test connection.
- MySQL: 
    - Support for calling Stored Procedures and better handling of query cancellation.
    - Switch to using `mysqlclient` (a maintained fork of `Python-MySQL`).
- MongoDB: Support serializing Decimal128 values.
- Presto: support for passwords in connection settings.
- Amazon Athena: allow to specify custom work group.
- Query Results: querying a column with a dictionary or array fails
- Clickhouse: make sure we don't show password in error messages.
- Enable Cassandra support by default.

### Visualizations

- Charts:
    - Fix: legend overlapping chart on small screens.
    - Fix: Pie chart not rendering when series doesn't exist in options.
    - Pie Chart: add option to set direction of slices.
- WordCloud: rewritten to support new options (provide frequency in query, limits), scale when resizing, handle long words and more.
- Pivot Table: support hiding totals.
- Counters: apply formatting to target value.
- Maps:
    - Ability to customize marker icon and color.
    - Customization options for Choropleth maps.
- New Visualization: Details View.

### **UX**

- Replace blank screen with a loading indicator when the application is doing its first load.
- Multiple improvements to dashboards editing: auto-save, grid markings and better refresh indicator.
- Admin can now edit user's groups from the user page.
- Add keyboard shortcut (Ctrl/Cmd+Shift+F) to trigger query formatting.

### API

- Query Result API response minimized to only required fields when called with a non user API key.
- Prefer API key over cookies in authentication.
- User can now regenerate Query API Key.

### Other Changes

- Sends CSP headers to prevent various kinds of security attacks via the browser. Might break unusual usages and embeds of Redash.
- New Failed Scheduled Queries email report (can be enabled from organization settings screen).
- Deprecated HipChat Alert Destination.
- Add options to hide different parts of a Visualization embed UI (parameters, title, link to query).
- Support multi-byte search for query names and descriptions (needs to be enabled in Organization settings screen).
- CSV query results download: correctly serialize booleans and date values.
- Dashboard filters now collect values from all widgets with the same filter.
- Support for custom message and description in alert notifications (currently disabled behind a feature flag until we improve the alert UX).

### Bug Fixes

- Fix: adding widget to dashboard from a query page is broken.
- Fix: default time format option was wrong.
- Fix: when too many errors of a scheduled queries occur it causes an OverflowError.
- Fix: when forking a query maintain the same visualizations order.

## v7.0.0 - 2019-03-17

We're trying a new format for the CHANGELOG in this release. Focusing on the bigger changes, but for whoever interested, you can see all the changes [here](https://github.com/getredash/redash/compare/v6.0.0...master).

Besides all the features, bug fixes and improvements listed below we managed to convert a large portion of Redash's frontend code from Angular.js to React. You can see status in [#3071](https://github.com/getredash/redash/issues/3071).

This release was made possible with the help of 34 contributors. 🙇‍♂️

### Data Sources

- **All data source options are now encrypted in the database.** By default the encryption uses the `REDASH_COOKIE_SECRET` value (`redash.settings.COOKIE_SECRET`), but you can specify a different value by setting the `REDASH_SECRET_KEY` environment variable value. Note that you need to set this _before_ doing the upgrade.
- New Data Sources: Uptycs and Apache Drill.
- Snowplow: is now enabled by default & supports region setting.
- Elasticsearch: add support for Amazon Elasticsearch IAM authentication (with IAM profile or key/secret pair).
- PostgreSQL: add support for serializing range values.
- Redshift: remove duplicate column information for late-binding views.
- Athena: load all databases (using pagination).
- BigQuery: correctly handle temp tables with no schema field.
- Jira (JQL): support for fetching all records with pagination.
- Prometheus: fix schema loading and add support for query range.

### In-app Help

You can now open the [Knowledge Base](https://redash.io/help) inside the application. We also added a few "help triggers" in the app, that will open the Knowledge Base in context of what you're currently doing.

### Parameters

- **Dashboard Parameters**: We improved the flow of adding queries with parameters to dashboards and now give you full control over how parameters are mapped. You no longer have to make sure all parameters have the same name or use the `Global` checkbox. We also added new options, like keeping the parameter local to the widget or setting a static value. [Read more in our Knowledge Base →](https://redash.io/help/user-guide/querying/query-parameters#Parameter-Mapping-on-Dashboards)
- We added server side validation of parameter values for all parameter types, except for parameters of `text` type. All validated parameter types are considered safe. When a query is using safe parameters (or no parameters at all), View Only users can refresh it.
- Refreshing safe queries is done using the new results API endpoint, which takes only a query ID (and optionally parameter values) and does not need the query text.

### Query Editor Improvements

- Run only the highlighted query text: hit Execute after highlighting a portion of your query and only the selected portion will be sent to the database. This is useful for testing sub-SELECT statements and CTE's.
- Improved auto complete: add a dot . after a table name in the query editor and auto complete will only suggest columns on that table.
- Autosave parameter configuration changes.
- YAML syntax support (for data sources like Yandex Metrica).

### Improved Query Scheduler

The Query Scheduler got a face lift and some new options: you can pick a day for a weekly schedule to run on and also set an end date after which the query will no longer execute on schedule.

### Data Sources

We added Apache Drill, Uptycs and a new JSON data source. Also fixed a few bugs in Athena's query runner and others.

### User Management

The users page got revamped with a new look and feel and few new features:

- An indication when a user was last active.
- Show if an invited user hasn't finished the setup process yet (Pending Invitations section).
- You can now generate a new API key for users, if there's a concern it was compromised.

### Admin

- New Celery queues status screens, replacing the old Queries Status and better reflecting the status of running queries.
- Make the queue name for schema refresh job configurable. The default used to be hard coded `schemas`, which is not available on all setups. Now it's `celery`.
- The `gevent` library is installed by default, and you can now setup gunicorn to use `gevent` based workers.
- New Docker entrypoint command to do a health check for a worker process.
- Flask-Admin is no longer setup or supported.

### Other Changes

- New Alert destination: Google Hangouts Chat.
- When downloading results from the results API it will set a user friendly filename for the downloaded file.
- Archived Queries section added to the queries list.

### Bug Fixes

- Fixed: fork query does not fork tables but instead adds default table.
- Fixed: when deleting a visualization, any widget using it was left empty on the dashboard.
- Fixed: issues with Query Editor resizing on new versions of Chrome.
- Fixed: issues with exporting dictionaries to Excel.
- Fixed: Cohort visualization gets stuck when passing string values.
- Fixed: use series name for Pie chart label.
- Make sure Flask app created in Celery's worker process (could cause some query runners to get stuck while running queries).

## v6.0.0 - 2018-12-16

v6.0.0 release version. Mainly includes fixes for regressions from the beta version.

This release had contributions from 5 people: @rauchy, @denisov-vlad, @arikfr, @ariarijp, and @gabrieldutra. Thank you, everyone 🙏

### Changed

- #3183 Make refresh_queries less noisey in logs. @arikfr

### Fixed

- #3163 Include correct version in production builds. @rauchy
- #3161 Clickhouse: fix int() conversion error. @denisov-vlad
- #3166 Directly using record_event task requires timestamp. @arikfr
- #3167 Alert.evaluate failing when the column is missing. @arikfr
- ##3162 Remove API permissions for users who have been disabled. @rauchy
- #3171 Reject empty query name. @ariarijp
- #3175, #3186 Fix disable error message. @rauchy, @gabrieldutra
- #3182 [Redshift] support for schema names with dots. @arikfr
- #3187 Safely create_app in Celery code (try to fetch current_app first). @arikfr

### Other

- #3155 Add DB Seed to Cypress and setup Percy. @gabrieldutra
- #3180 Remove coverage from pytest terminal output. @rauchy

## v6.0.0-beta - 2018-12-03

This release was 2 months in the making and it is full with good stuff!

- We have 5 new data sources: Databricks, IBM DB2, Kylin, Druid and Rockset. ⌗
- There are fixes and improvements to 11 existing data sources (MySQL, Redshift, Postgres, MongoDB, Google BigQuery, Vertica, TreasureData, Presto, ClickHouse, Google Sheets and Google Analytics).
- The Query Results data source can now load cached results, just use the `cached_query_` prefix instead of `query_`.
- On the visualizations front we added a Heatmap visualization and did updated the table and counter visualizations.
- Alerts got some fixes and a new destination: PagerDuty.
- If the live autocomplete in the code editor annoys you, you can disable it now (although we're working to make it better, see #3092).
- Fast queries will now load faster. 🏃‍♂️
- We improved the layout of visualizations and content on smaller screen sizes. 📱
- For those of you who like sharing, you can now enable the ability to share ownership of queries and dashboards and let others to edit them. Check the Settings page to enable this feature.

There were also important changes to the code and infrastructure:

- More components moved to React.
- We switched to Webpack 4 with the help of @dmonego.
- We upgraded to Celery 4 with the help of @emtwo, @jezdez, @mashrikt and @atharvai.
- We started moving towards Python 3 for our backend. The first step was to make sure our code pass basic sanity tests with Flake 8, which was implemented by @cclauss.
- We improved our testing on the frontend by adding setup for Jest tests and E2E testing using Cypress (@gabrieldutra).
- Each pull request now gets a deploy preview using Netlify to easily test frontend changes.

This is just a summary, you're welcome to review the full list below. ⬇

This release had contributions from 38 people: @arikfr, @kravets-levko, @jezdez, @kyoshidajp, @kocsmy, @alison985, @gabrieldutra, @washort, @GitSumito, @emtwo, @rauchy, @alexanderlz, @denisov-vlad, @ariarijp, @yoavbls, @zhujunsan, @sjakthol, @koooge, @SakuradaJun, @dmonego, @Udomomo, @cclauss, @combineads, @zaimy, @Trigl, @ralphilius, @jodevsa, @deecay, @igorcanadi, @pashaxp, @hoangphuoc25, @toph, @burnash, @wankdanker, @Yossi-a, @Rovel, @kadrach, and @nicof38. Thank you, everyone 🙏

### Added

- #2747, #3143 Add a new Databricks query runner. @alison985, @jezdez, @arikfr
- #2767 Add ability to add viz to dashboard from query edit page. @alison985, @jezdez
- #2780 Add a query autocomplete toggle. @alison985, @jezdez, @arikfr
- #2768 Add authentication via JWT providers. @SakuradaJun
- #2790 Add the ability to sort favorited queries, paginate the dashboard list and improve UI inconsistencies. @jezdez
- #2681 Add ability to search table column names in schema browser. @alison985
- #2855 Add option to query cached results. @yoavbls
- #2740 Add ability for extensions to add periodic tasks. @emtwo
- #2924 Google Spreadsheets: Add support for opening by URL. @alexanderlz
- #2903 Add PagerDuty as an Alert Destination. @alexanderlz
- #2824 Add support for expanding dashboard visualizations. @sjakthol
- #2900 Add ability to specify a counter label. @ralphilius
- #2565 Add frontend extension capabilities. @emtwo
- #2848 Add IBM Db2 as a data source using the ibm-db Python package. @nicof38
- #2959 Add option to auto reload widget data in shared dashboards. @arikfr
- #2993 Add page size settings. @kyoshidajp
- #2080 New Heatmap chart visualization with Plotly. @deecay
- #2991 Show users in CLI group list. @GitSumito
- #2342 New SQLPARSE_FORMAT_OPTIONS setting to configure query formatter. @ariarijp
- #3031 Add some tests for Query Results. @ariarijp
- #2936 Add Kylin data source. @Trigl
- #3047 Add Druid data source. @rauchy
- #3077 New user interface for the feature flag of the share edit permissions feature. @arikfr
- #3007 Add permissions to the result of "manage.py groups list" command. @Udomomo
- #3088 Add get_current_user() fuction for the Python query runner. @kyoshidajp
- #3114 Add event tracking to autocomplete toggle. @arikfr
- #3068 Add Rockset query runner. @igorcanadi, @arikfr
- #3105 Display frontend version. @rauchy

### Changed

- #2636 Rewrite query editor with React. @washort, @arikfr
- #2637 Convert edit-in-place component to React. @washort, @arikfr
- #2766 Suitable events are now being recorded server side instead of in the frontend. @alison985, @jezdez
- #2796 Change placement (right/bottom) of chart legend depending on chart width. @kravets-levko
- #2833 Uses server side sort order for tag list and show count of tagged items. @jezdez
- #2318 Support authentication for the URL data source. @jezdez
- #2884 Rename Yandex Metrika to Metrica. @jezdez
- #2909 MySQL: hide sys tables. @arikfr
- #2817 Consistently use simplejson for loading and dumping JSON. @jezdez
- #2872 Use Plotly's function to clean y-values (x may be category or date/time). @kravets-levko
- #2938 Auto focus tag input. @kyoshidajp
- #2927 Design refinements for queries pages. @kocsmy
- #2950 Show activity status in CLI user list. @GitSumito
- #2968 Presto data source: setting protocol (http/https), safe loading of error messages. @arikfr
- #2967 Show groups in CLI user list. @GitSumito
- #2603 MongoDB: Update requirements to support srv. @arikfr
- #2961 MongoDB: Skip system collections when loading schema. @arikfr
- #2960 Add timeout to various HTTP requests. @arikfr
- #2983 Databricks: New logo, updated name and enabled by default. @arikfr
- #2982 Table visualization: change default size to 25 and add more size options. @arikfr
- #2866 Redshift: Hide tables the configured user cannot access. @sjakthol
- #3058 Mustache: don't html-escape query parameters values. @kravets-levko
- #3079 Always use basic autocomplete, as well as the live autocomplete. @arikfr
- #3084 Support tel://, sms://, mailto:// links in query results. @zhujunsan
- #3083 Clickhouse: Add WITH TOTALS option support. @denisov-vlad
- #3063 Allow setting colors for bubble charts. @toph
- #3085 BigQuery: Switch to Standard SQL as the default. @kyoshidajp
- #3094 Tags autocomplete: Show note when creating a new label. @kravets-levko
- #2984 Autocomplete toggle improvements. @arikfr
- #3089 Open new tab when forking a query. @kyoshidajp
- #3126 MongoDB: add support for sorting columns. @arikfr
- #3128 Improve backoff algorithm of query results polling to speed it up. @arikfr
- #3125 Vertica: update driver & add support for connection timeout. @arikfr
- #3124 Support unicode in Postgres/Redshift schema. @arikfr
- #3138 Migrate all tags components to React. @kravets-levko
- #3139 Better manage permissions modal. @kocsmy
- #3149 Improve tag link colors and fix group tags on Users page. @kocsmy
- #3146 Update, replace and fix new alert destination logos so it fits better. @kocsmy
- #3147 Add and improve recent db logos that didn't fit in size properly. @kocsmy
- #3148 Fix label positioning on no found screen. @kocsmy
- #3156 json_dumps: add support for serializing buffer objects. @arikfr

### Fixed

- #2849 Fix invalid reference to alert.to_dict() in webhook. @wankdanker
- #2840 Improve counter visualization text scaling. @kravets-levko
- #2854 Widget titles are no longer rendered wrong on public dashboards. @kravets-levko
- #2318 Removed redundant exception handling in data sources since that's handled in the query backend. @jezdez
- #2886 Fix Javascript build that broke because registerAll tried to run EditInPlace component. @arikfr
- #2911 Don’t show “Add to dashboard” in dropdown to unsaved queries. @jezdez
- #2916 Fix export query results output file name. @gabrieldutra
- #2917 Fix output file name not changing after rename query. @gabrieldutra
- #2868 Address edge case when retrieving Glue schemas for Athena data source. @kadrach
- #2929 Fix: date value in a filter is duplicated. @combineads
- #2875 Unbreak charts with long legend break in horizontal mode. Update plotly.js. @kravets-levko
- #2937 Fix event recording in admin API backend. @kyoshidajp
- #2953 Minor fixes for the Clickhouse data source. @denisov-vlad
- #2941 Bring back fix to Box plot hover. @arikfr
- #2957 Apply missing CSS classes to EditInPlace component. @arikfr
- #2897 Show "Add description" only after saving the query. @arikfr
- #2922 Query page layout improvements for small screens. @kravets-levko
- #2956 Clickhouse: move timeout to params. @denisov-vlad
- #2964 Fix no tags shown when having empty set. @gabrieldutra
- #2757 Use full text search ranking when searching in list views. @jezdez
- #2969 Query Results data source: improved errors, quoted column names. @arikfr
- #2906 Preventing open redirection in loging process. @kyoshidajp
- #2867 TreasureData: Deduplicate column names. @zaimy
- #2994 Fix scheme of various URLs from http to https. @kyoshidajp
- #2992 Fix an invalid prop type warning in new version notifier. @kyoshidajp
- #3022 Fix Toolbox covering part of a chart. @kravets-levko
- #2998 Fix charts losing responsive features after refreshing the dashboard. @kravets-levko
- #3034 Postgres: handle NaN/Infinity values. @kravets-levko
- #2745 Sort columns with undefined values. @Yossi-a
- #3041 Sort CLI output of lists. @GitSumito
- #2803, #3006 Address various tag display issues on query list page. @kocsmy, @alison985
- #3049 Fix edit-in-place component which ignored isEditable flag and didn't work on Groups page. @kravets-levko
- #2965 Google Analytics: Fix crash when no results are returned. @alexanderlz
- #3061 Fix table visualization so that the horizontal scrollbar is not be always visible. @kravets-levko
- #3076 Add white-space padding to separators in the footer. @burnash
- #2919 Fix URL data source to not require a URL. @arikfr
- #3098 Force AngularJS to update query editor properly. @washort
- #3100 Delete redundant regex segment in query result frontend. @zhujunsan
- #2978 Prevent the query update timestamp from changing when it is linked to new query results. @rauchy
- #3046 Fix query page header. @kravets-levko
- #3097 Mongo: Fix collection fields retreival bug when Views are present. @jodevsa
- #3107 Keep query text in local state for now. @washort
- #3111 Fix mobile padding issues on Query results. @kocsmy
- #3122 Show menu divider only if query is archived. @jezdez
- #3120 Fix tag counts for dashboards and queries. @jezdez
- #3141 Fix schema refresh to work on MySQL 8. @hoangphuoc25
- #3142 Fix: editing dashboard title results in the visualizations being replaced by the loading markers. @kravets-levko

### Other

- #2850 The setup scripts are now based on Ubuntu 18.04 LTS and Docker. @pashaxp, @arikfr
- #2985 Add Jest based tests to our stack. @arikfr
- #2999 Add netlify configuration. @arikfr
- #3000 Initial Cypress based E2E test infrastructure. @gabrieldutra
- #2898 Move Ant styles into a central location. @arikfr
- #2910 Fix webpack build error about BigMessage. @jezdez
- #2928 Speed up builds by skipping installing requirements_all_ds.txt in CI unit tests. @arikfr
- #2963 Fix tarball build failure. @emtwo
- #2996 Fix setup.sh failures when run as root. @arikfr
- #2989 Rearrange make targets. @koooge
- #3036 Update Flask-Admin to 1.5.2. @yoavbls
- #2901 Fix documentation links. @kravets-levko
- #3073 Remove only Redash containers in clean Make task. @ariarijp
- #3048 Remove pytest-watch dependency to workaround an issue with watchdog. @rauchy
- #2905 Update development docker-compose.yml file to use latest Redis and Postgres servers and specify working volume explictly. @Rovel
- #3032 Makefile: Add make targets for test. @koooge
- #2933 Switch to Webpack 4. @dmonego
- #2908 Update setup files. @arikfr
- #2946 Update snowflake_connector_python version. @arikfr
- #2773 Upgrade to Celery 4.2.1. @emtwo, @jezdez
- #2881 CircleCI: Make flake8 tests pass on Legacy Python and Python 3. @cclauss
- #2907 Remove unused dependencies (honcho, wsgiref). @arikfr
- #3039 Build docker image on master branch. @arikfr
- #3106 Fix registerAll failures after minification. @arikfr

## v5.0.2 - 2018-10-18

### Security

- Fix: prevent Open Redirect vulnerability.

## v5.0.1 - 2018-09-27

### Added

- Added support for JWT authentication (for services like Cloudflare Access or Google IAP).

### Changed

- Upgraded Celery version to 3.1.26 to make upgrade to Celery 4 easier.

## v5.0.0 - 2018-09-21

Final release for V5. Most of the changes were already in the beta release of V5, but this includes several fixes along
with UI improvements.

🙏 Thanks to @arikfr, @jezdez, @kravets-levko, @alison985, @kocsmy, @yossi-a, @tdsmith, @nasmithan, @jrbenny35, @sjakthol, @ariarijp and @combineads who contributed to this release.

### Security

- Fix: don't expose Google OAuth client secret. @arikfr

### Changed

- Improve mobile rendering of dashboards and queries. @kocsmy
- UI improvements for favorites and empty state. @arikfr
- Remove unnecessary X at the end of the query search. @kocsmy
- Add server-side sorting to dashboard list. @jezdez
- Sort queries in descending order. @jezdez
- Throw error when non-owner tries to add a user to dashboard permissions. @alison985
- Propagate query execution errors from Celery tasks properly. @alison985
- Reload the route when using the app header search input. @jezdez

### Fixed

- Fix: BigQuery default location is null and not US. @arikfr
- Fix: query embeds are broken. @arikfr
- Fix: typo in Celery log foramt. @ariarijp
- Use QuerySerializer in outdated queries list. @jezdez
- Fix: sometimes widgets are getting zero height. @kravets-levko
- Athena: Switch to simple_json to serialize NaN/Infinity values as nulls. @kravets-levko, @jezdez
- Fix: queries with parameters with no value breaking the scheduler. @arikfr
- Fix: MongoDB query results parser didn't support unicode keys. @arikfr
- Fix: Google Analytics schema wasn't loading in some cases. @arikfr
- Fix: date/time parameters not working as global param @kravets-levko.
- Fix: Widgets crumble when trying to move / resize a widget. @kravets-levko
- Fix: handling rows with "length" field with forOwn method. @yossi-a
- Fix: query selection not working on alert page. @sjakthol
- Fix: query_results for Embedded Parameters (removed deprecated to_dict function). @nasmithan
- Fix: unicode not supported in dashboard search. @combineads
- Fix: unicode not supported in users search. @arikfr

### Other

- Add test for using saved parameters in scheduled queries. @alison985
- Minor code smell cleanup. @jezdez
- Update QueryResultListResource docstring. @tdsmith
- Switch to CirlceCI 2.0 @jrbenny35, @arikfr
- Remove unnecessary init methods. @jezdez

## v5.0.0-Beta - 2018-08-06

This is the first beta of the V5 release (and hopefully the last one). This version includes a lot of exciting new additions along with bug fixes and other changes.

Some notable changes:

- Extensive work on parameters UI:
  - New Date Range parameter type.
  - UI for creating new parameters.
  - Support for Now/Today as default value of date/time parameter.
- Tagging and favorites ⭐️ support for queries and dashboards.
- Users list page was improved (search, additional information) and you can now disable users.
- Query editor improvements: additional keyboard shortcuts and support for searching in query text.
- Visualizations improvements: option to select colors of pie chart sectors, X Axis type auto detect and option to format values, labels and tooltips.
- Data Sources:
  - Support for Yandex Metrika and AppMetrika.
  - BigQuery: location property support and schema will load all tables now.
  - Elasticsearch: stop sending source_content_type parameter which wasn't supported in older versions.
- Started migrating the frontend codebase to React.

And much more!

🙏 Thanks to @kravets-levko, @arikfr, @ariarijp, @alison985, @kyoshidajp, @kocsmy, @denisov-vlad, @deecay, @yuua, @emtwo, @Pablohn26, @sieben, @atharvai, @matsumo, @tdawber, @innovia, @gabrieldutra, @coreyhuinker, @maxv, @sjakthol, @mtrbean and @washort who contributed to this release!

### Added

- #2712: Date/Time Range parameter type (@kravets-levko)
- #2482: Add support for ChatWork Alert Destination. (@matsumo)
- #2678: Explicit "Add Parameter" Button in Query Editor. (@kravets-levko)
- #2513: Add location property to BigQuery data source settings. (@kyoshidajp)
- #2616: Pie chart: support setting pie chart sector colors. (@kravets-levko)
- #2697: Date/Time parameters: support for "Now" as default value. (@kravets-levko)
- #2693: Enable search function in Query Editor. (@arikfr)
- #2573: Tagging and favorites for Queries and Dashboards (@arikfr)
- #2640: Keyboard shortcut to collapse query editor/schema browser (@kravets-levko)
- #2674: Add support for the Chrome Logger extension (@arikfr)
- #2653: Add redash db size to status page (@alison985)
- #2669: Store Athena query id with result metadata (@tdawber)
- #2546: Configuration for incorporating React components (@washort)
- #2533: New datasource: Yandex Metrika & AppMetrika (@denisov-vlad)
- #2536: Chart: formats for values, labels and tooltips (@kravets-levko)
- #2560: Introduce Policy object (@arikfr)
- #2380: Admin should be able to disable a user (@kravets-levko)
- #2509: Show custom date format on settings page (@kyoshidajp)

### Changed

- #2715: Improve users list page (@arikfr)
- #2710: Update Ant variables to fit Redash's style (@kocsmy)
- #2709: Move format button next Add New Param button. (@arikfr)
- #2664: Dashboard shows a spinner when query failed to load (@kravets-levko)
- #2626: Show real status when loading cached query result (@kravets-levko)
- #2663: Set column name implicitly when column name is blank (@ariarijp)
- #2695: Improve Date/DateTime type parameters (@kravets-levko)
- #2694: Block users with disposable email addresses (@arikfr)
- #2687: YAML: changed load to safe_load (@denisov-vlad)
- #2514: Update value parsing for google spreadsheets source (@atharvai)
- #2570: fixes query pagination alignment (@alison985)
- #2584: keep query result pagination out of scroll (@alison985)
- #2647: Improve Script Query Runner (@ariarijp)
- #2583: Query header improvements on widgets (@kocsmy)
- #2671: Save some space (@kocsmy)
- #2658: delaying schema filtering to improve responsiveness (@alison985)
- #2648: Update datasource documentation links (@Pablohn26)
- #2613: Improve Script Query Runner (@ariarijp)
- #2619: data source sort case insensitive (@alison985)
- #2604: Improve Google Spreadsheets Query Runner (@ariarijp)
- #2542: Closes #2541: x-axis improvements. (@emtwo)
- #2590: Remove redundant variables (@ariarijp)
- #2585: Show data only mode: allow to add and delete visualizations (@kravets-levko)
- #2549: Allow get_tables to see views and v10-style partitioned tables (@coreyhuinker)
- #2568: sort datasources alphabetically (@alison985)
- #2444: feat: show error if saml response cannot be parsed (@sjakthol)
- #2554: Display name to be delete (@kyoshidajp)
- #2510: Display confirmation dialog when deleting a item (@kyoshidajp)
- #2518: Design improvements (@kocsmy)
- #2520: Filter data sources in a data source input area (@kyoshidajp)

### Fixed

- #2722: Elasticsearch: Don't send source_content_type parameter. (@arikfr)
- #2719: Remove closing input tags (@maxv)
- #2458: Get all tables in the BigQuery (@kyoshidajp)
- #2698: Make sure we return distinct data source values (@arikfr)
- #2315: Fix: pyHive type matches (@yuua)
- #2638: Dashboard stops rendering when adding widget with empty query (@kravets-levko)
- #2610: Fix export query results output file name (@gabrieldutra)
- #2574: commit query result to db before evaluating alerts (@mtrbean)
- #2580: add break-word wrap to add/edit text box on dashboard (@alison985)
- #2578: Fix connection error when you run "create_tables" (@ariarijp)
- #2572: remove extra menu line if query is archived (@alison985)
- #2526: Fix pivot hide control in dashboards (@deecay)
- #2511: Fixing signed_out.html template (@kocsmy)
- #2523: Frontend: fix boolean field with null value display as null. (@innovia)

### Other

- #2682: Add Zeit's now support to have preview builds for every PR (@arikfr)
- #2668: Upgrade bootstrap script to Redash 4.0.1 (@ariarijp)
- #2639: Add tests for SpreadSheets (@ariarijp)
- #2635: Add tests for Query Results (@ariarijp)
- #2537: Remove trailing semicolon (@sieben)

## v4.0.1 - 2018-05-02

### Added

- Log user's screen resolution. @arikfr

### Changed

- [Redshift] fix the order of columns in the schema browser. @akiray03
- Improve dashboard refresh UX: show previous data while refreshing. @arikfr

### Fixed

- Disable fork button to view_only users. @tonyjiangh
- Hide overflowing data source and alert destination names. @kocsmy
- Login pages were broken on mobile. @kocsmy
- Cohort visualization wasn't rendering if value wasn't properly detected as date. @kravets-levko
- Dashboard filters setting wasn't persisting. @arikfr
- Display nulls and empty values as blank in table numeric fields. @chriszs
- Date column on alerts page is labeled "Created By". @dbravender
- Bootstrap script was breaking due to incompatability with pip 10. @ariarijp

### Other

- Updated README. @kocsmy

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
- Cassandra: get_schema support for both C\* 2.x and 3.x, support for SortedSet type serialization. (@mfouilleul))
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
- [MongoDB] add \$oids JSON extension.
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
- Only split columns with \_\_/:: that end with filter/MultiFilter.
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
- Fix: remove \$\$hashKey from Pivot table
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
- [#1601][presto] friendlier error messages. (@aslotnick)
- Move the query runner unavailable log message to be DEBUG level instead of WARNING, as it was mainly confusing people.
- Remove "Send to Cloud" button from Plotly based visualizations.
- Change Plotly's default hover mode to "Compare".
- [#1612] Change: Improvements to the dashboards list page.

### Fixed

- [#1564] Fix: map visualization column picker wasn't populated. (@janusd)
- [#1597][sql server] Fix: schema wasn't loading on case sensitive servers. (@deecay)
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
- [DynamoDB] Fix: count(\*) queries were broken. (@kopanitsa))
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

- Refactor the frontend to use latest (at the time) Angular version (1.5) along with better frontend pipeline based on)
  WebPack.
- Refactor the backend code to use SQLAlchemy and Alembic, for easier migrations/upgrades.)

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

- 61fe16e #1374: Add: allow '\*' in REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN (Allen Short)
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

A big thank you goes to all who contributed code and documentation in this release: @AntoineAugusti, @James226, @adamlwgriffiths, @alexdebrie, @anthony-coble, @ariarijp, @dheerajrav, @edwardsharp, @machira, @nabilblk, @ninneko, @ordd, @tomerben, @toru-takahashi, @vishesh92, @vorakumar and @whummer.

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
- e20a005 #1007: Issue#1006: Make bottom margin editable for Chart visualization (@vorakumar)
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
- fec0d5f #1037: Fix: multi filter wasn't working with \_\_ syntax (@dheerajrav)
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
