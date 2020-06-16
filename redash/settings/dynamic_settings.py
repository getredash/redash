# Replace this method with your own implementation in case you want to limit the time limit on certain queries or users.
def query_time_limit(is_scheduled, user_id, org_id):
    from redash import settings

    if is_scheduled:
        return settings.SCHEDULED_QUERY_TIME_LIMIT
    else:
        return settings.ADHOC_QUERY_TIME_LIMIT


def periodic_jobs():
    """Schedule any custom periodic jobs here. For example:

    from time import timedelta
    from somewhere import some_job, some_other_job

    return [
        {"func": some_job, "interval": timedelta(hours=1)},
        {"func": some_other_job, "interval": timedelta(days=1)}
    ]
    """
    pass


# This provides the ability to override the way we store QueryResult's data column.
# Reference implementation: redash.models.DBPersistence
QueryResultPersistence = None


def ssh_tunnel_auth():
    """
    To enable data source connections via SSH tunnels, provide your SSH authentication
    pkey here. Return a string pointing at your **private** key's path (which will be used
    to extract the public key), or a `paramiko.pkey.PKey` instance holding your **public** key.
    """
    return {
        # 'ssh_pkey': 'path_to_private_key', # or instance of `paramiko.pkey.PKey`
        # 'ssh_private_key_password': 'optional_passphrase_of_private_key',
    }