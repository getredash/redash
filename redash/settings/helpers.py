import json
import os
import urlparse
import urllib


def parse_db_url(url):
    url_parts = urlparse.urlparse(url)
    connection = {'threadlocals': True}

    if url_parts.hostname and not url_parts.path:
        connection['name'] = url_parts.hostname
    else:
        connection['name'] = url_parts.path[1:]
        connection['host'] = url_parts.hostname
        connection['port'] = url_parts.port
        connection['user'] = url_parts.username
        # Passwords might be quoted with special characters
        connection['password'] = url_parts.password and urllib.unquote(url_parts.password)

    return connection


def fix_assets_path(path):
    fullpath = os.path.join(os.path.dirname(__file__), "../", path)
    return fullpath


def array_from_string(s):
    array = s.split(',')
    if "" in array:
        array.remove("")

    return array


def set_from_string(s):
    return set(array_from_string(s))


def parse_boolean(str):
    return json.loads(str.lower())


def int_or_none(value):
    if value is None:
        return value

    return int(value)
