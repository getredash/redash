# Change Log

## 0.12 [Unreleased]

### Added

61fe16e #1374: Add: allow '*' in REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN (Allen Short)  
2f09043 #1113: Add: share modify/access permissions for queries and dashboard (Arik Fraimovich)  
3db0eea #1341: Add: support for specifying SAML nameid-format (zoetrope)  
b0ecd0e #1343: Add: support for local SAML metadata file (zoetrope)  
0235d37 #1335: Add: allow changing alert email subject. (Arik Fraimovich)  
2135dfd #1333: Add: control over y axis min/max values (Arik Fraimovich)  
49e788a #1328: Add: support for snapshot generation service (Arik Fraimovich)  
229ca6c #1323: Add: collect runtime metrics for Celery tasks (Arik Fraimovich)  
931a1f3 #1315: Add: support for loading BigQuery schema (Arik Fraimovich)  
39b4f9a #1314: Add: support MongoDB SSL connections (Arik Fraimovich)  
ca1ca9b #1312: Add: additional configuration for Celery jobs (Arik Fraimovich)  
fc00e61 #1310: Add: support for date/time with seconds parameters (Arik Fraimovich)  
d72a198 #1307: Add: API to force refresh data source schema (Arik Fraimovich)  
beb89ec #1305: Add: UI to edit dashboard text box widget (Kazuhito Hokamura)  
808fdd4 #1298: Add: JIRA (JQL) query runner (Arik Fraimovich)  
ff9e844 #1280: Add: configuration flag to disable scheduled queries (Hirotaka Suzuki)  
ef4699a #1269: Add: Google Drive federated tables support in BigQuery query runner (Kurt Gooden)  
2eeb947 #1236: Add: query runner for Cassandra and ScyllaDB (syerushalmy)  
10b398e #1249: Add: override slack webhook parameters (mystelynx)  
2b5e340 #1252: Add: Schema loading support for Presto query runner (using information_schema) (Rohan Dhupelia)  
2aaf5dd #1250: Add: query snippets feature (Arik Fraimovich)  
8d8af73 #1226: Add: Sankey visualization (Arik Fraimovich)  
a02edda #1222: Add: additional results format for sunburst visualization (Arik Fraimovich)  
0e70188 #1213: Add: new sunburst sequence visualization (Arik Fraimovich)  
9a6d2d7 #1204: Add: show views in schema browser for Vertica data sources (Matthew Carter)  
600afa5 #1138: Add: ability to register user defined function (UDF) resources for BigQuery DataSource/Query (fabito)  
b410410 #1166: Add: "every 14 days" refresh option (Arik Fraimovich)  


### Changed

002f794 #1368: Change: added ability to disable auto update in admin views (Arik Fraimovich)  
aa5d14e #1366: Change: improve error message for exception in the Python query runner (deecay)  
880627c #1355: Change: pass the user object to the run_query method (Arik Fraimovich)  
23c605b #1342: SAML: specify entity id (zoetrope)  
015b1dc #1334: Change: allow specifying recipient address when sending email test message (Arik Fraimovich)  
39aaa2f #1292: Change: improvements to map visualization (Arik Fraimovich)  
b22191b #1332: Change: upgrade Python packages (Arik Fraimovich)  
23ba98b #1331: Celery: Upgrade Celery to more recent version. (Arik Fraimovich)  
3283116 #1330: Change: upgrade Requests to latest version. (Arik Fraimovich)  
39091e0 #1324: Change: add more logging and information for refresh schemas task (Arik Fraimovich)  
462faea #1316: Change: remove deprecated settings (Arik Fraimovich)  
73e1837 #1313: Change: more flexible column width calculation (Arik Fraimovich)  
e8eb840 #1279: Change: update bootstrap.sh to support Ubuntu 16.04 (IllusiveMilkman)  
8cf0252 #1262: Change: upgrade Plot.ly version and switch to smaller build (Arik Fraimovich)  
0b79fb8 #1306: Change: paginate queries page & add explicit urls. (Arik Fraimovich)  
41f99f5 #1299: Change: send Content-Type header (application/json) in query results responses (Tsuyoshi Tatsukawa)  
dfb1a20 #1297: Change: update Slack configuration titles. (Arik Fraimovich)  
8c1056c #1294: Change: don't annotate BigQuery queries (Arik Fraimovich)  
a3cf92e #1289: Change: use key_as_string when available (ElasticSearch query runner) (Arik Fraimovich)  
e155191 #1285: Change: do not display Oracle tablespace name in schema browser (Matthew Carter)  
6cbc39c #1282: Change: deduplicate Google Spreadsheet columns (Arik Fraimovich)  
4caf2e3 #1277: Set specific version of cryptography lib (Arik Fraimovich)  
d22f0d4 #1216: Change: bootstrap.sh - use non interactive dist-upgrade (Atsushi Sasaki)  
19530f4 #1245: Change: switch from CodeMirror to Ace editor (Arik Fraimovich)  
dfb92db #1234: Change: MongoDB query runner set DB name as mandatory (Arik Fraimovich)  
b750843 #1230: Change: annotate Presto queries with metadata (Noriaki Katayama)  
5b20fe2 #1217: Change: install libffi-dev for Cryptography (Ubuntu setup script) (Atsushi Sasaki)  
a9fac34 #1206: Change: update pymssql version to 2.1.3 (kitsuyui)  
5d43cbe #1198: Change: add support for Standard SQL in BigQuery query runner (mystelynx)  
84d0c22 #1193: Change: modify the argument order of moment.add function call (Kenya Yamaguchi)  


### Fixed

d6febb0 #1375: Fix: Download Dataset does not work when not logged in (Joshua Dechant)  
96553ad #1369: Fix: missing format call in Elasticsearch test method (Adam Griffiths)  
c57c765 #1365: Fix: compare retrieval times in UTC timezone (Allen Short)  
37dff5f #1360: Fix: connection test was broken for MySQL (ichihara)  
360028c #1359: Fix: schema loading query for Hive was wrong for non default schema (laughingman7743)  
7ee41d4 #1358: Fix: make sure all calls to run_query updated with new parameter (Arik Fraimovich)  
0d94479 #1329: Fix: Redis memory leak. (Arik Fraimovich)  
7145aa2 #1325: Fix: queries API was doing N+1 queries in most cases (Arik Fraimovich)  
cd2e927 #1311: Fix: BoxPlot visualization wasn't rendering on a dashboard (Arik Fraimovich)  
a562ce7 #1309: Fix: properly render checkboxes in dynamic forms (Arik Fraimovich)  
d48192c #1308: Fix: support for Unicode columns name in Google Spreadsheets (Arik Fraimovich)  
e42f93f #1283: Fix: schema browser was unstable after opening a table (Arik Fraimovich)  
170bd65 #1272: Fix: TreasureData get_schema method was returning array instead of string as column name (ariarijp)  
4710c41 #1265: Fix: refresh modal not working for unsaved query (Arik Fraimovich)  
bc3a5ab #1264: Fix: dashboard refresh not working (Arik Fraimovich)  
6202d09 #1240: Fix: when shared dashboard token not found, return 404 (Wesley Batista)  
93aac14 #1251: Fix: autocomplete went crazy when database has no autocomplete. (Arik Fraimovich)  
b8eca28 #1246: Fix: support large schemas in schema browser (Arik Fraimovich)  
b781003 #1223: Fix: Alert: when hipchat Alert.name is multibyte character, occur error. (toyama0919)  
0b928e6 #1227: Fix: Bower install fails in vagrant (Kazuhito Hokamura)  
a411af2 #1232: Fix: don't show warning when query string (parameters value) changes (Kazuhito Hokamura)  
3dbb5a6 #1221: Fix: sunburst didn't handle all cases of path lengths (Arik Fraimovich)  
a7cc1ee #1218: Fix: updated result not being saved when changing query text. (Arik Fraimovich)  
0617833 #1215: Fix: email alerts not working (Arik Fraimovich)  
78f65b1 #1187: Fix: read only users receive the permission error modal in query view (Arik Fraimovich)  
bba801f #1167: Fix the version of setuptools on bootstrap script for Ubuntu (Takuya Arita)  
ce81d69 #1160: Fix indentation in docker-compose-example.yml (Hirofumi Wakasugi)  
dd759fe #1155: Fix: make all configuration values of Oracle required (Arik Fraimovich)  

### Docs
a69ee0c #1225: Fix: RST formatting of the Vagrant documentation (Kazuhito Hokamura)  
03837c0 #1242: Docs: add warning re. quotes on column names and BigQuery (Ereli)  
9a98075 #1255: Docs: add documentation for InfluxDB (vishesh92)  
e0485de #1195: Docs: fix typo in maintenance page title (Antoine Augusti)  
7681d3e #1164: Docs: update permission documentation (Daniel Darabos)  
bcd3670 #1156: Docs: add SSL parameters to nginx configuration (Josh Cox)  

## v0.11.1.b2095 - 2016-08-02

This is a hotfix release, which fixes an issue with email alerts in v0.11.0.

## v0.11.0.b2016 - 2016-07-03

The main features of this release are:

- Alert Destinations: ability to define multiple destinations for alert notifications (currently implemented: HipChat, Slack, Webhook and email).
- The long-awaited UI for query parameters (see example in #1069).

Also, this release includes numerous smaller features, improvements, and bug fixes.

A big thank you goes to all who contributed code and documentation in this release: @AntoineAugusti, @James226, @adamlwgriffiths, @alexdebrie, @anthony-coble, @ariarijp, @dheerajrav, @edwardsharp, @machira, @nabilblk, @ninneko, @ordd, @tomerben,  @toru-takahashi, @vishesh92, @vorakumar and @whummer.

### Added
d5e5b24 #1136: Feature: add --org option to all relevant CLI commands. (@adamlwgriffiths)  
87e25f2 #1129: Feature: support for JSON query formatting (Mongo, ElasticSearch) (@arikfr)  
6bb2716 #1121: Show error when failing to communicate with server (@arikfr)  
f21276e #1119: Feature: add UI to delete alerts (@arikfr)  
8656540 #1069: Feature: UI for query parameters (@arikfr)  
790128c #1067: Feature: word cloud visualization (@anthony-coble)  
8b73a2b #1098: Feature: UI for alert destinations & new destination types (@alexdebrie)  
1fbeb5d #1092: Add Heroku support (@adamlwgriffiths)  
f64622d #1089: Add support for serialising UUID type within MSSQL #961 (@James226)  
857caab #1085: Feature: API to pause a data source (@arikfr)  
214aa3b #1060: Feature: support configuring user's groups with SAML (@vorakumar)  
e20a005 #1007: Issue#1006:  Make bottom margin editable for Chart visualization (@vorakumar)  
6e0dd2b #1063: Add support for date/time Y axis (@tomerben)  
b5a4a6b #979: Feature: Add CLI to edit group permissions (@ninneko)  
6d495d2 #1014: Add server-side parameter handling for embeds (@whummer)  
5255804 #1091: Add caching for queries used in embeds (@whummer)  

### Changed
0314313 #1149: Presto QueryRunner supports tinyint and smallint (@toru-takahashi)  
8fa6fdb #1030: Make sure data sources list ordered by id (@arikfr)  
8df822e #1141: Make create data source button more prominent (@arikfr)  
96dd811 #1127: Mark basic_auth_password as secret (@adamlwgriffiths)  
ad65391 #1130: Improve Slack notification style (@AntoineAugusti)  
df637e3 #1116: Return meaningful error when there is no cached result. (@arikfr)  
65635ec #1102: Switch to HipChat V2 API (@arikfr)  
14fcf01 #1072: Remove counter from the tasks Done tab (as it always shows 50). #1047 (@arikfr)  
1a1160e #1062: DynamoDB: Better exception handling (@arikfr)  
ed45dcb #1044: Improve vagrant flow (@staritza)  
8b5dc8e #1036: Add optional block for more scripts in template (@arikfr)  

### Fixed
dbd48e1 #1143: Fix: use the email input type where needed (@ariarijp)  
7445972 #1142: Fix: dates in filters might be duplicated (@arikfr)  
5d0ed02 #1140: Fix: Hive should use the enabled variable (@arikfr)  
392627d #1139: Fix: Impala data source referencing wrong variable (@arikfr)  
c5bfbba #1133: Fix: query scrolling issues (@vishesh92)  
c01d266 #1128: Fix: visualization options not updating after changing type (@arikfr)  
6bc0e7a #1126: Fix #669: save fails when doing partial save of new query (@arikfr)  
3ce27b9 #1118: Fix: remove alerts for archived queries (@arikfr)  
4fabaae #1117: Fix #1052: filter not working for date/time values (@arikfr)  
c107c94 #1077: Fix: install needed dependencies to use Hive in Docker image (@nabilblk)  
abc790c #1115: Fix: allow non integers in alert reference value (@arikfr)  
4ec473c #1110: Fix #1109: mixed group permissions resulting in wrong permission (@arikfr)  
1ca5262 #1099: Fix RST syntax for links (@adamlwgriffiths)  
daa6c1c #1096: Fix typo in env variable VERSION_CHECK (@AntoineAugusti)  
cd06d27 #1095: Fix: use create_query permission for new query button. (@ordd)  
2bc0b27 #1061: Fix: area chart stacking doesn't work (@machira)  
8c21e91 #1108: Remove potnetially concurrency not safe code form enqueue_query (@arikfr)  
e831218 #1084: Fix #1049: duplicate alerts when data source belongs to multiple groups (@arikfr)  
6edb0ca #1080: Fix typo (@jeffwidman)  
64d7538 #1074: Fix: ElasticSearch wasn't using correct type names (@toyama0919)  
3f90dd9 #1064: Fix: old task trackers were not really removed (@arikfr)  
e10ecd2 #1058: Bring back filters if dashboard filters are enabled (@AntoineAugusti)  
701035f #1059: Fix: DynamoDB having issues when setting host (@arikfr)  
2924d4f #1040: Small fixes to visualizations view (@arikfr)  
fec0d5f #1037: Fix: multi filter wasn't working with __ syntax (@dheerajrav)  
b066ce4 #1033: Fix: only ask for notification permissions if wasn't denied (@arikfr)  
960c416 #1032: Fix: make sure we return dashboards only for current org only (@arikfr)  
b3844d3 #1029: Hive: close connection only if it exists (@arikfr)  

### Docs
6bb09d8 #1146: Docs: add a link to settings documentation. (@adamlwgriffiths)  
095e759 #1103: Docs: add section about monitoring (@AntoineAugusti)  
e942486 #1090: Contributing Guide (@arikfr)  
3037c4f #1066: Docs: command type-o fix. (@edwardsharp)  
2ee0065 #1038: Add an ISSUE_TEMPLATE.md to direct people at the forum (@arikfr)  
f7322a4 #1021: Vagrant docs: add purging the cache step (@ariarijp)  

---

For older releases check the GitHub releases page:
https://github.com/getredash/redash/releases
