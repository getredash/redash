---
title: Developer Guide
sidebar:
  order: 3
---

Redash is a Python (3) and Javascript / Typescript app. To fully run Redash you will also need
PostgreSQL (version 9.6 or newer) and Redis (version 3 or newer). While it's not
needed in production, for development you will need a recent version of Node.js
(latest LTS version is recommended).

On the backend we use Flask, RQ and SQLALchemy (along with many other packages) and on
the frontend we use ES6, React and Webpack for bundling.

:::note

Windows users: while it should be possible to run Redash on a Windows machine, we don't know anyone who did this and lived to tell. We recommend using some sort of a virtual machine or Docker in such case.

:::

## Setup

- [Developer Installation Guide](https://github.com/getredash/redash/wiki/Local-development-setup)
- [Debugging a Redash Server on Docker Using Visual Studio Code](/help/open-source/dev-guide/debugging/)
- [Using a remote server and installing locally only the frontend dependencies](/help/open-source/dev-guide/remote-server/)
- [Frontend End-to-End Tests](https://github.com/getredash/redash/wiki/Testing-your-changes#comprehensive-e2e-testing-cypress)

## Additional Resources

- [How to create a new visualization](https://discuss.redash.io/t/how-to-create-new-visualization-types-in-redash/86)
- [How to create a new query runner](/help/open-source/dev-guide/write-a-query-runner/)

## Getting Help

- [GitHub Discussions](https://github.com/getredash/redash/discussions/categories/q-a)
