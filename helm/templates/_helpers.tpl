{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "redash.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "redash.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 43 chars because some Kubernetes name fields are limited to 64 (by the DNS naming spec),
and we use this as a base for component names (which can add up to 20 chars).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "redash.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 43 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 43 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 43 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create a default fully qualified scheduler name.
*/}}
{{- define "redash.scheduler.fullname" -}}
{{- template "redash.fullname" . -}}-scheduler
{{- end -}}

{{/*
Create a default fully qualified genericWorker name.
*/}}
{{- define "redash.genericWorker.fullname" -}}
{{- template "redash.fullname" . -}}-genericworker
{{- end -}}

{{/*
Create a default fully qualified adhocWorker name.
*/}}
{{- define "redash.adhocWorker.fullname" -}}
{{- template "redash.fullname" . -}}-adhocworker
{{- end -}}

{{/*
Create a default fully qualified scheduledworker name.
*/}}
{{- define "redash.scheduledWorker.fullname" -}}
{{- template "redash.fullname" . -}}-scheduledworker
{{- end -}}

{{/*
Create a default fully qualified postgresql name.
*/}}
{{- define "redash.postgresql.fullname" -}}
{{- printf "%s-%s" .Release.Name "postgresql" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified redis name.
*/}}
{{- define "redash.redis.fullname" -}}
{{- printf "%s-%s" .Release.Name "redis-master" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Get the secret name.
*/}}
{{- define "redash.secretName" -}}
{{- if .Values.redash.existingSecret }}
    {{- printf "%s" .Values.redash.existingSecret -}}
{{- else -}}
    {{- printf "%s" (include "redash.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Shared environment block used across each component.
*/}}
{{- define "redash.env" -}}
{{- if not .Values.postgresql.enabled }}
- name: REDASH_DATABASE_URL
  value: {{ default "" .Values.externalPostgreSQL | quote }}
{{- else }}
- name: REDASH_DATABASE_USER
  value: "{{ .Values.postgresql.postgresqlUsername }}"
- name: REDASH_DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Release.Name }}-postgresql
      key: postgresql-password
- name: REDASH_DATABASE_HOSTNAME
  value: {{ include "redash.postgresql.fullname" . }}
- name: REDASH_DATABASE_PORT
  value: "{{ .Values.postgresql.service.port }}"
- name: REDASH_DATABASE_DB
  value: "{{ .Values.postgresql.postgresqlDatabase }}"
{{- end }}
{{- if not .Values.redis.enabled }}
- name: REDASH_REDIS_URL
  value: {{ default "" .Values.externalRedis | quote }}
{{- else }}
- name: REDASH_REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
    {{- if .Values.redis.existingSecret }}
      name: {{ .Values.redis.existingSecret }}
    {{- else }}
      name: {{ .Release.Name }}-redis
    {{- end }}
      key: redis-password
- name: REDASH_REDIS_HOSTNAME
  value: {{ include "redash.redis.fullname" . }}
- name: REDASH_REDIS_PORT
  value: "{{ .Values.redis.master.port }}"
- name: REDASH_REDIS_DB
  value: "{{ .Values.redis.databaseNumber }}"
{{- end }}
{{- range $key, $value := .Values.env }}
- name: "{{ $key }}"
  value: "{{ $value }}"
{{- end }}
## Start primary Redash configuration
{{- if or .Values.redash.secretKey .Values.redash.existingSecret }}
- name: REDASH_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "redash.secretName" . }}
      key: secretKey
{{- end }}
{{- if .Values.redash.proxiesCount }}
- name: REDASH_PROXIES_COUNT
  value: {{ default  .Values.redash.proxiesCount | quote }}
{{- end }}
{{- if .Values.redash.statsdHost }}
- name: REDASH_STATSD_HOST
  value: {{ default  .Values.redash.statsdHost | quote }}
{{- end }}
{{- if .Values.redash.statsdPort }}
- name: REDASH_STATSD_PORT
  value: {{ default  .Values.redash.statsdPort | quote }}
{{- end }}
{{- if .Values.redash.statsdPrefix }}
- name: REDASH_STATSD_PREFIX
  value: {{ default  .Values.redash.statsdPrefix | quote }}
{{- end }}
{{- if .Values.redash.statsdUseTags }}
- name: REDASH_STATSD_USE_TAGS
  value: {{ default  .Values.redash.statsdUseTags | quote }}
{{- end }}
{{- if .Values.redash.celeryBroker }}
- name: REDASH_CELERY_BROKER
  value: {{ default  .Values.redash.celeryBroker | quote }}
{{- end }}
{{- if .Values.redash.celeryBackend }}
- name: REDASH_CELERY_BACKEND
  value: {{ default  .Values.redash.celeryBackend | quote }}
{{- end }}
{{- if .Values.redash.celeryTaskResultExpires }}
- name: REDASH_CELERY_TASK_RESULT_EXPIRES
  value: {{ default  .Values.redash.celeryTaskResultExpires | quote }}
{{- end }}
{{- if .Values.redash.queryResultsCleanupEnabled }}
- name: REDASH_QUERY_RESULTS_CLEANUP_ENABLED
  value: {{ default  .Values.redash.queryResultsCleanupEnabled | quote }}
{{- end }}
{{- if .Values.redash.queryResultsCleanupCount }}
- name: REDASH_QUERY_RESULTS_CLEANUP_COUNT
  value: {{ default  .Values.redash.queryResultsCleanupCount | quote }}
{{- end }}
{{- if .Values.redash.queryResultsCleanupMaxAge }}
- name: REDASH_QUERY_RESULTS_CLEANUP_MAX_AGE
  value: {{ default  .Values.redash.queryResultsCleanupMaxAge | quote }}
{{- end }}
{{- if .Values.redash.schemasRefreshQueue }}
- name: REDASH_SCHEMAS_REFRESH_QUEUE
  value: {{ default  .Values.redash.schemasRefreshQueue | quote }}
{{- end }}
{{- if .Values.redash.schemasRefreshSchedule }}
- name: REDASH_SCHEMAS_REFRESH_SCHEDULE
  value: {{ default  .Values.redash.schemasRefreshSchedule | quote }}
{{- end }}
{{- if .Values.redash.authType }}
- name: REDASH_AUTH_TYPE
  value: {{ default  .Values.redash.authType | quote }}
{{- end }}
{{- if .Values.redash.enforceHttps }}
- name: REDASH_ENFORCE_HTTPS
  value: {{ default  .Values.redash.enforceHttps | quote }}
{{- end }}
{{- if .Values.redash.invitationTokenMaxAge }}
- name: REDASH_INVITATION_TOKEN_MAX_AGE
  value: {{ default  .Values.redash.invitationTokenMaxAge | quote }}
{{- end }}
{{- if .Values.redash.multiOrg }}
- name: REDASH_MULTI_ORG
  value: {{ default  .Values.redash.multiOrg | quote }}
{{- end }}
{{- if .Values.redash.googleClientId }}
- name: REDASH_GOOGLE_CLIENT_ID
  value: {{ default  .Values.redash.googleClientId | quote }}
{{- end }}
{{- if or .Values.redash.googleClientSecret .Values.redash.existingSecret }}
- name: REDASH_GOOGLE_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "redash.secretName" . }}
      key: googleClientSecret
{{- end }}
{{- if .Values.redash.remoteUserLoginEnabled }}
- name: REDASH_REMOTE_USER_LOGIN_ENABLED
  value: {{ default  .Values.redash.remoteUserLoginEnabled | quote }}
{{- end }}
{{- if .Values.redash.remoteUserHeader }}
- name: REDASH_REMOTE_USER_HEADER
  value: {{ default  .Values.redash.remoteUserHeader | quote }}
{{- end }}
{{- if .Values.redash.ldapLoginEnabled }}
- name: REDASH_LDAP_LOGIN_ENABLED
  value: {{ default  .Values.redash.ldapLoginEnabled | quote }}
{{- end }}
{{- if .Values.redash.ldapUrl }}
- name: REDASH_LDAP_URL
  value: {{ default  .Values.redash.ldapUrl | quote }}
{{- end }}
{{- if .Values.redash.ldapBindDn }}
- name: REDASH_LDAP_BIND_DN
  value: {{ default  .Values.redash.ldapBindDn | quote }}
{{- end }}
{{- if or .Values.redash.ldapBindDnPassword .Values.redash.existingSecret }}
- name: REDASH_LDAP_BIND_DN_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "redash.secretName" . }}
      key: ldapBindDnPassword
{{- end }}
{{- if .Values.redash.ldapDisplayNameKey }}
- name: REDASH_LDAP_DISPLAY_NAME_KEY
  value: {{ default  .Values.redash.ldapDisplayNameKey | quote }}
{{- end }}
{{- if .Values.redash.ldapEmailKey }}
- name: REDASH_LDAP_EMAIL_KEY
  value: {{ default  .Values.redash.ldapEmailKey | quote }}
{{- end }}
{{- if .Values.redash.ldapCustomUsernamePrompt }}
- name: REDASH_LDAP_CUSTOM_USERNAME_PROMPT
  value: {{ default  .Values.redash.ldapCustomUsernamePrompt | quote }}
{{- end }}
{{- if .Values.redash.ldapSearchTemplate }}
- name: REDASH_LDAP_SEARCH_TEMPLATE
  value: {{ default  .Values.redash.ldapSearchTemplate | quote }}
{{- end }}
{{- if .Values.redash.ldapSearchDn }}
- name: REDASH_LDAP_SEARCH_DN
  value: {{ default  .Values.redash.ldapSearchDn | quote }}
{{- end }}
{{- if .Values.redash.staticAssetsPath }}
- name: REDASH_STATIC_ASSETS_PATH
  value: {{ default  .Values.redash.staticAssetsPath | quote }}
{{- end }}
{{- if .Values.redash.jobExpiryTime }}
- name: REDASH_JOB_EXPIRY_TIME
  value: {{ default  .Values.redash.jobExpiryTime | quote }}
{{- end }}
{{- if or .Values.redash.cookieSecret .Values.redash.existingSecret }}
- name: REDASH_COOKIE_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "redash.secretName" . }}
      key: cookieSecret
{{- end }}
{{- if .Values.redash.logLevel }}
- name: REDASH_LOG_LEVEL
  value: {{ default  .Values.redash.logLevel | quote }}
{{- end }}
{{- if .Values.redash.mailServer }}
- name: REDASH_MAIL_SERVER
  value: {{ default  .Values.redash.mailServer | quote }}
{{- end }}
{{- if .Values.redash.mailPort }}
- name: REDASH_MAIL_PORT
  value: {{ default  .Values.redash.mailPort | quote }}
{{- end }}
{{- if .Values.redash.mailUseTls }}
- name: REDASH_MAIL_USE_TLS
  value: {{ default  .Values.redash.mailUseTls | quote }}
{{- end }}
{{- if .Values.redash.mailUseSsl }}
- name: REDASH_MAIL_USE_SSL
  value: {{ default  .Values.redash.mailUseSsl | quote }}
{{- end }}
{{- if .Values.redash.mailUsername }}
- name: REDASH_MAIL_USERNAME
  value: {{ default  .Values.redash.mailUsername | quote }}
{{- end }}
{{- if or .Values.redash.mailPassword .Values.redash.existingSecret }}
- name: REDASH_MAIL_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "redash.secretName" . }}
      key: mailPassword
{{- end }}
{{- if .Values.redash.mailDefaultSender }}
- name: REDASH_MAIL_DEFAULT_SENDER
  value: {{ default  .Values.redash.mailDefaultSender | quote }}
{{- end }}
{{- if .Values.redash.mailMaxEmails }}
- name: REDASH_MAIL_MAX_EMAILS
  value: {{ default  .Values.redash.mailMaxEmails | quote }}
{{- end }}
{{- if .Values.redash.mailAsciiAttachments }}
- name: REDASH_MAIL_ASCII_ATTACHMENTS
  value: {{ default  .Values.redash.mailAsciiAttachments | quote }}
{{- end }}
{{- if .Values.redash.host }}
- name: REDASH_HOST
  value: {{ default  .Values.redash.host | quote }}
{{- end }}
{{- if .Values.redash.alertsDefaultMailSubjectTemplate }}
- name: REDASH_ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE
  value: {{ default  .Values.redash.alertsDefaultMailSubjectTemplate | quote }}
{{- end }}
{{- if .Values.redash.throttleLoginPattern }}
- name: REDASH_THROTTLE_LOGIN_PATTERN
  value: {{ default  .Values.redash.throttleLoginPattern | quote }}
{{- end }}
{{- if .Values.redash.limiterStorage }}
- name: REDASH_LIMITER_STORAGE
  value: {{ default  .Values.redash.limiterStorage | quote }}
{{- end }}
{{- if .Values.redash.corsAccessControlAllowOrigin }}
- name: REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN
  value: {{ default  .Values.redash.corsAccessControlAllowOrigin | quote }}
{{- end }}
{{- if .Values.redash.corsAccessControlAllowCredentials }}
- name: REDASH_CORS_ACCESS_CONTROL_ALLOW_CREDENTIALS
  value: {{ default  .Values.redash.corsAccessControlAllowCredentials | quote }}
{{- end }}
{{- if .Values.redash.corsAccessControlRequestMethod }}
- name: REDASH_CORS_ACCESS_CONTROL_REQUEST_METHOD
  value: {{ default  .Values.redash.corsAccessControlRequestMethod | quote }}
{{- end }}
{{- if .Values.redash.corsAccessControlAllowHeaders }}
- name: REDASH_CORS_ACCESS_CONTROL_ALLOW_HEADERS
  value: {{ default  .Values.redash.corsAccessControlAllowHeaders | quote }}
{{- end }}
{{- if .Values.redash.enabledQueryRunners }}
- name: REDASH_ENABLED_QUERY_RUNNERS
  value: {{ default  .Values.redash.enabledQueryRunners | quote }}
{{- end }}
{{- if .Values.redash.additionalQueryRunners }}
- name: REDASH_ADDITIONAL_QUERY_RUNNERS
  value: {{ default  .Values.redash.additionalQueryRunners | quote }}
{{- end }}
{{- if .Values.redash.disabledQueryRunners }}
- name: REDASH_DISABLED_QUERY_RUNNERS
  value: {{ default  .Values.redash.disabledQueryRunners | quote }}
{{- end }}
{{- if .Values.redash.adhocQueryTimeLimit }}
- name: REDASH_ADHOC_QUERY_TIME_LIMIT
  value: {{ default  .Values.redash.adhocQueryTimeLimit | quote }}
{{- end }}
{{- if .Values.redash.enabledDestinations }}
- name: REDASH_ENABLED_DESTINATIONS
  value: {{ default  .Values.redash.enabledDestinations | quote }}
{{- end }}
{{- if .Values.redash.additionalDestinations }}
- name: REDASH_ADDITIONAL_DESTINATIONS
  value: {{ default  .Values.redash.additionalDestinations | quote }}
{{- end }}
{{- if .Values.redash.eventReportingWebhooks }}
- name: REDASH_EVENT_REPORTING_WEBHOOKS
  value: {{ default  .Values.redash.eventReportingWebhooks | quote }}
{{- end }}
{{- if .Values.redash.sentryDsn }}
- name: REDASH_SENTRY_DSN
  value: {{ default  .Values.redash.sentryDsn | quote }}
{{- end }}
{{- if .Values.redash.allowScriptsInUserInput }}
- name: REDASH_ALLOW_SCRIPTS_IN_USER_INPUT
  value: {{ default  .Values.redash.allowScriptsInUserInput | quote }}
{{- end }}
{{- if .Values.redash.dashboardRefreshIntervals }}
- name: REDASH_DASHBOARD_REFRESH_INTERVALS
  value: {{ default  .Values.redash.dashboardRefreshIntervals | quote }}
{{- end }}
{{- if .Values.redash.queryRefreshIntervals }}
- name: REDASH_QUERY_REFRESH_INTERVALS
  value: {{ default  .Values.redash.queryRefreshIntervals | quote }}
{{- end }}
{{- if .Values.redash.passwordLoginEnabled }}
- name: REDASH_PASSWORD_LOGIN_ENABLED
  value: {{ default  .Values.redash.passwordLoginEnabled | quote }}
{{- end }}
{{- if .Values.redash.samlMetadataUrl }}
- name: REDASH_SAML_METADATA_URL
  value: {{ default  .Values.redash.samlMetadataUrl | quote }}
{{- end }}
{{- if .Values.redash.samlEntityId }}
- name: REDASH_SAML_ENTITY_ID
  value: {{ default  .Values.redash.samlEntityId | quote }}
{{- end }}
{{- if .Values.redash.samlNameidFormat }}
- name: REDASH_SAML_NAMEID_FORMAT
  value: {{ default  .Values.redash.samlNameidFormat | quote }}
{{- end }}
{{- if .Values.redash.dateFormat }}
- name: REDASH_DATE_FORMAT
  value: {{ default  .Values.redash.dateFormat | quote }}
{{- end }}
{{- if .Values.redash.jwtLoginEnabled }}
- name: REDASH_JWT_LOGIN_ENABLED
  value: {{ default  .Values.redash.jwtLoginEnabled | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthIssuer }}
- name: REDASH_JWT_AUTH_ISSUER
  value: {{ default  .Values.redash.jwtAuthIssuer | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthPublicCertsUrl }}
- name: REDASH_JWT_AUTH_PUBLIC_CERTS_URL
  value: {{ default  .Values.redash.jwtAuthPublicCertsUrl | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthAudience }}
- name: REDASH_JWT_AUTH_AUDIENCE
  value: {{ default  .Values.redash.jwtAuthAudience | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthAlgorithms }}
- name: REDASH_JWT_AUTH_ALGORITHMS
  value: {{ default  .Values.redash.jwtAuthAlgorithms | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthCookieName }}
- name: REDASH_JWT_AUTH_COOKIE_NAME
  value: {{ default  .Values.redash.jwtAuthCookieName | quote }}
{{- end }}
{{- if .Values.redash.jwtAuthHeaderName }}
- name: REDASH_JWT_AUTH_HEADER_NAME
  value: {{ default  .Values.redash.jwtAuthHeaderName | quote }}
{{- end }}
{{- if .Values.redash.featureShowQueryResultsCount }}
- name: REDASH_FEATURE_SHOW_QUERY_RESULTS_COUNT
  value: {{ default  .Values.redash.featureShowQueryResultsCount | quote }}
{{- end }}
{{- if .Values.redash.versionCheck }}
- name: REDASH_VERSION_CHECK
  value: {{ default  .Values.redash.versionCheck | quote }}
{{- end }}
{{- if .Values.redash.featureDisableRefreshQueries }}
- name: REDASH_FEATURE_DISABLE_REFRESH_QUERIES
  value: {{ default  .Values.redash.featureDisableRefreshQueries | quote }}
{{- end }}
{{- if .Values.redash.featureShowPermissionsControl }}
- name: REDASH_FEATURE_SHOW_PERMISSIONS_CONTROL
  value: {{ default  .Values.redash.featureShowPermissionsControl | quote }}
{{- end }}
{{- if .Values.redash.featureAllowCustomJsVisualizations }}
- name: REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS
  value: {{ default  .Values.redash.featureAllowCustomJsVisualizations | quote }}
{{- end }}
{{- if .Values.redash.featureDumbRecents }}
- name: REDASH_FEATURE_DUMB_RECENTS
  value: {{ default  .Values.redash.featureDumbRecents | quote }}
{{- end }}
{{- if .Values.redash.featureAutoPublishNamedQueries }}
- name: REDASH_FEATURE_AUTO_PUBLISH_NAMED_QUERIES
  value: {{ default  .Values.redash.featureAutoPublishNamedQueries | quote }}
{{- end }}
{{- if .Values.redash.bigqueryHttpTimeout }}
- name: REDASH_BIGQUERY_HTTP_TIMEOUT
  value: {{ default  .Values.redash.bigqueryHttpTimeout | quote }}
{{- end }}
{{- if .Values.redash.schemaRunTableSizeCalculations }}
- name: REDASH_SCHEMA_RUN_TABLE_SIZE_CALCULATIONS
  value: {{ default  .Values.redash.schemaRunTableSizeCalculations | quote }}
{{- end }}
{{- if .Values.redash.webWorkers }}
- name: REDASH_WEB_WORKERS
  value: {{ default  .Values.redash.webWorkers | quote }}
{{- end }}
## End primary Redash configuration
{{- end -}}

{{/*
Common labels
*/}}
{{- define "redash.labels" -}}
helm.sh/chart: {{ include "redash.chart" . }}
{{ include "redash.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "redash.selectorLabels" -}}
app.kubernetes.io/name: {{ include "redash.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "redash.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "redash.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

# This ensures a random value is provided for postgresqlPassword:
required "A secure random value for .postgresql.postgresqlPassword is required" .Values.postgresql.postgresqlPassword
