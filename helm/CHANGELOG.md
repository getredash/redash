# Changelog

## 2.0.0

- Made secrets required, rather than auto-generating to avoid them [changing on upgrade](https://github.com/helm/charts/issues/5167)
- Variable additions and template updates to bring in line with Helm 3 chart template
- Add support for external secrets
- Extended CI testing for multiple k8s and Helm versions
- Extended CI testing for testing major version upgrades
- Moved install and upgrade logic to Helm hooks
- Added basic connectivity test hook for `helm test`
- Created values for each environment variable accepted by Redash

## 1.2.0

- Upgrade Redash to 8.0.2.b37747
- Upgrade PostgreSQL chart (the old version used depreciated APIs) and image tag
- Upgrade Redis chart

## 1.1.0

- Initial release of chart on getredash namespace
- Upgrade Redash to 8.0.1.b33387
- Add support for external Redis server
- Add CI linting/testing and release automation

## Pre-release

For pre-release versions please see the [pull request](https://github.com/helm/charts/pull/5071) where this was originally developed.
