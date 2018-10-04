import json
import os


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
