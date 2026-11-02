---
title: Secret Keys in Redash
---

## Background

Redash encrypts secret information with two keys: the Cookie Secret and the Application Secret.

### Cookie Secret

The cookie secret is taken from the `REDASH_COOKIE_SECRET` environment variable. It is used for various cryptographic features of the web server, such as authenticating users, signing cookies, and storing user session information. It is required to start the application.

If you attempt to start Redash without it, the webserver will not initialise and you will find the following message in your logs:

```bash
Exception: You must set the REDASH_COOKIE_SECRET environment variable. Visit http://redash.io/help/open-source/admin-guide/secrets for more information.
```

To fix this message: create an environment variable called `REDASH_COOKIE_SECRET` and give it a value.

### Application Secret

The application secret is taken from the `REDASH_SECRET_KEY` environment variable. It is used to encrypt all settings on the Settings > Data Sources screen and Settings > Alert Destinations screen.

It is required to start the application. However, if you do not set one explicitly, Redash will use the cookie secret instead. This is helpful for development. But for maximum security, we recommend you set a unique value for both variables.

## Choosing a Secret Key

We recommend you follow the [official Flask guidance](https://flask.palletsprojects.com/en/2.0.x/tutorial/deploy/#configure-the-secret-key) for selecting a secret key. During development it's fine to use a simple secret key, but...

> This should be changed to some random bytes in production. Otherwise, attackers could use the public 'dev' key to modify the session cookie, or anything else that uses the secret key.

A strong secret key will be random and impossible to guess. Do not reuse secret keys across instances of Redash or commit them to version control.

Flask recommends using the `secrets` built-in Python module:

```python
$ python -c 'import secrets; print(secrets.token_hex())'

'192b9bdd22ab9ed4d12e236c78afcb9a393ec15f71bbf5dc987d54727823bcbf'
```

Our cloud images use the CLI tool `pwgen`:

```bash
$ pwgen -1s 64

QinPGTd7Ulec03lar0vkI9ojqmXsuw4VOyirnC5NuvEdJSCwLwesmknNygXITunT
```

:::note

The official Redash cloud images found [here](/help/open-source/setup/) generate unique secret keys automatically during deployment. If you deployed Redash manually with Docker Compose you can create a `.env` file adjacent to `compose.yaml` and set your environment variables there.

:::

## Changing a Secret Keys

Under normal circumstances, you configure your secret keys while deploying Redash and will not touch them again. However, if a key is compromised (by committing it to a version control system, for example) you should change it immediately.

### Changing the Cookie Secret

Assuming you have already explicitly set `REDASH_SECRET_KEY`, you can safely change `REDASH_COOKIE_SECRET` at any time. This will immediately reset all active user sessions, but is otherwise free of side-effects.

If you did not already explicitly set `REDASH_SECRET_KEY`, then you should use the instructions in the next section to reencrypt your secret fields before modifying `REDASH_COOKIE_SECRET`. Otherwise your existing data sources will be inaccessible to Redash.

### Changing the Application Secret

Because Redash encrypts secret fields at rest in its internal database, if you change `REDASH_SECRET_KEY` you must also reencrypt these fields. Otherwise you will not be able to execute queries, modify your data sources, or even access the data source settings screen.

:::danger

Do not delete your `REDASH_SECRET_KEY` until you have finished re-encrypting secret fields. Without it your data sources will become unusable.

:::

#### Re-encrypting Secret Fields

The Redash CLI includes the `database reencrypt` command to conveniently re-encrypt your secret fields stored by Redash. It accepts two positional arguments: the old secret and the new secret. When you run the command, the secret fields in Redash's internal database are decrypted using the old secret and encrypted again with the new secret. This includes data source definitions and alert destinations.

If you deployed Redash using docker-compose (from one of our cloud images, for instance) you can invoke this CLI on your docker host with this command:

```bash
$ docker-compose run --rm server manage database reencrypt ${old_secret} ${new_secret}
```
