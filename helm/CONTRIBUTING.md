# Contributing Guidelines

The Redash Chart project accepts contributions via GitHub pull requests. This document outlines the process to help get your contribution accepted.

### Reporting a Bug in Redash

This repository is used by Chart developers for maintaining the Redash chart for Kubernetes Helm. If your issue is in the Redash tool itself, please use the issue tracker in the [getredash/redash](https://github.com/getredash/redash) repository.

Before opening a new issue or submitting a new pull request, it's helpful to search the project - it's likely that another user has already reported the issue you're facing, or it's a known issue that we're already aware of.

## How to Contribute

1. Fork this repository, develop and test your Chart changes.
1. Ensure your Chart changes follow the [technical](#technical-requirements).
1. Submit a pull request.

### Technical Requirements

- Must pass the linter (`helm lint`)
- If Redash [environment variable configuration](https://github.com/getredash/website/blob/master/src/pages/kb/open-source/admin-guide/env-vars-settings.md) changes it should be updated using [the process below](#updating-environment-variable-config).
- The [README](README.md) must be regenerated using [helm-docs](https://github.com/norwoodj/helm-docs) and Markdown files should be formatted using [prettier](https://prettier.io/) - you can run this manually or use the [pre-commit hook](#pre-commit-hook)
- Must successfully launch following basic steps in the [README](README.md#installing-the-chart)
  - All pods go to the running state
  - All services have at least one endpoint
- Must be up-to-date with the latest stable Helm/Kubernetes features
- Should follow Kubernetes best practices
  - Include Health Checks wherever practical
  - Allow configurable [resource requests and limits](http://kubernetes.io/docs/user-guide/compute-resources/#resource-requests-and-limits-of-pod-and-container)
- Provide a method for data persistence (if applicable)
- Support application upgrades
- Allow customization of the application configuration
- Provide a secure default configuration
- Do not leverage alpha features of Kubernetes
- Follows [best practices](https://github.com/helm/helm/tree/master/docs/chart_best_practices)
  (especially for [labels](https://github.com/helm/helm/blob/master/docs/chart_best_practices/labels.md)
  and [values](https://github.com/helm/helm/blob/master/docs/chart_best_practices/values.md))

### Updating Environment Variable Config

A script it used to help update the configuration (in between start/end markers) using the markdown documentation.

To run this script:

```bash
python scripts/update-env-config.py
```

Carefully review, test and commit the results. If changes are required (e.g. to mark a specific variable as a secret) update the script to produce the correct changes - don't manually edit the configuration between the markers.

### Pre-commit Hook Setup

- Install [helm-docs](https://github.com/norwoodj/helm-docs)
- Install [the pre-commit binary](https://pre-commit.com/#install)
- Then run:

```bash
pre-commit install
pre-commit install-hooks
```

- Future changes to your charts requirements.yaml, values.yaml, or Chart.yaml files will cause an update to documentation when you commit.
- Prettier will also format Markdown files using the default configuration.

### Merge Approval and Release Process

A Charts maintainer will review the Chart change submission, and the validation job in the CI to verify the technical requirements of the Chart.

Once the change request looks good it will be merged. This will trigger the publish job to automatically run in the CI to package and release the Chart to the repository.
