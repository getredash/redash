---
title: How to Upgrade
sidebar:
  order: 1
---

:::caution

These instructions are for users of our new Docker-based instance. If you run our older instances (or the old bootstrap script) check the [legacy guide](/help/open-source/admin-guide/how-to-upgrade-legacy/).

:::

We recommended you upgrade your Redash instance to the latest release so you can benefit from new features and bug fixes. This document assumes you used our images to set up your instance of Redash.

For best results you should upgrade Redash by one semantic version at a time. To move from V6 to V10, for example, you should upgrade V6 to V7 to V8 to V10.

During each migration, check the [releases page](https://github.com/getredash/redash/releases) for any special notices or breaking changes in the next version.

Below is a table of recent docker release images for your reference:

| released_at | version | docker_image                |
|-------------|---------|-----------------------------|
| 2026-09-24  | 26.9.0  | redash/redash:26.9.0        |
| 2026-03-02  | 26.3.0  | redash/redash:26.3.0        |
| 2025-08-01  | 25.8.0  | redash/redash:25.8.0        |
| 2025-01-08  | 25.1.0  | redash/redash:25.1.0        |
| 2021-12-24  | 10.1.0  | redash/redash:10.1.0.b50633 |
| 2021-10-02  | 10.0.0  | redash/redash:10.0.0.b50363 |
| 2019-10-27  | 8.0.0   | redash/redash:8.0.0.b32245  |
| 2019-03-17  | 7.0.0   | redash/redash:7.0.0.b18042  |
| 2018-12-17  | 6.0.0   | redash/redash:6.0.0.b8537   |
| 2018-10-18  | 5.0.2   | redash/redash:5.0.2.b5486   |
| 2018-09-27  | 5.0.1   | redash/redash:5.0.1.b4850   |

:::caution

If you are currently running an instance of Redash prior to V7, **do not upgrade directly to V8**. Upgrade semantically to V7 _first_. Read more about this on our forum [here](https://discuss.redash.io/t/database-migration-using-incorrect-key-for-encryption/4833).

:::

## Upgrade Process

1. Make sure to backup your data. You need to backup Redash's PostgreSQL database (the database Redash stores metadata in, not the ones you might be querying) and your `.env` file (if it exists). The data in Redis is transient.
2. Change directory to `/opt/redash`.
3. Update `/opt/redash/compose.yaml` Redash image reference to the one you want to upgrade to.
4. Stop Redash services: `docker compose stop server scheduler scheduled_worker adhoc_worker` (you might need to list additional services if you updated your configuration)
5. Apply migration (if necessary): `docker compose run --rm server manage db upgrade`
6. Start services: `docker compose up -d`

_Done!_

:::note

**Getting an error when running `docker` or `docker compose` commands?**

Make sure the `ubuntu` user is part of the `docker` group:

1. Run `sudo usermod -aG docker $USER` to add current user to the docker group.
2. Logout and login again.

:::
