import cStringIO
import csv
import codecs
import decimal
import datetime
import json
import random
import re
import hashlib
import pytz
import pystache

from funcy import distinct
from sqlalchemy.orm.query import Query

from .human_time import parse_human_time
from redash import settings

COMMENTS_REGEX = re.compile("/\*.*?\*/")


def utcnow():
    """Return datetime.now value with timezone specified.

    Without the timezone data, when the timestamp stored to the database it gets the current timezone of the server,
    which leads to errors in calculations.
    """
    return datetime.datetime.now(pytz.utc)


def slugify(s):
    return re.sub('[^a-z0-9_\-]+', '-', s.lower())


def gen_query_hash(sql):
    """Return hash of the given query after stripping all comments, line breaks
    and multiple spaces, and lower casing all text.

    TODO: possible issue - the following queries will get the same id:
        1. SELECT 1 FROM table WHERE column='Value';
        2. SELECT 1 FROM table where column='value';
    """
    sql = COMMENTS_REGEX.sub("", sql)
    sql = "".join(sql.split()).lower()
    return hashlib.md5(sql.encode('utf-8')).hexdigest()


def generate_token(length):
    chars = ('abcdefghijklmnopqrstuvwxyz'
             'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
             '0123456789')

    rand = random.SystemRandom()
    return ''.join(rand.choice(chars) for x in range(length))


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoding class, to handle Decimal and datetime.date instances."""

    def default(self, o):
        # Some SQLAlchemy collections are lazy.
        if isinstance(o, Query):
            return list(o)
        if isinstance(o, decimal.Decimal):
            return float(o)

        if isinstance(o, (datetime.date, datetime.time)):
            return o.isoformat()

        if isinstance(o, datetime.timedelta):
            return str(o)

        super(JSONEncoder, self).default(o)


def json_dumps(data):
    return json.dumps(data, cls=JSONEncoder)


def build_url(request, host, path):
    parts = request.host.split(':')
    if len(parts) > 1:
        port = parts[1]
        if (port, request.scheme) not in (('80', 'http'), ('443', 'https')):
            host = '{}:{}'.format(host, port)

    return "{}://{}{}".format(request.scheme, host, path)


class UnicodeWriter:
    """
    A CSV writer which will write rows to CSV file "f",
    which is encoded in the given encoding.
    """

    def __init__(self, f, dialect=csv.excel, encoding="utf-8", **kwds):
        # Redirect output to a queue
        self.queue = cStringIO.StringIO()
        self.writer = csv.writer(self.queue, dialect=dialect, **kwds)
        self.stream = f
        self.encoder = codecs.getincrementalencoder(encoding)()

    def _encode_utf8(self, val):
        if isinstance(val, (unicode, str)):
            return val.encode('utf-8')

        return val

    def writerow(self, row):
        self.writer.writerow([self._encode_utf8(s) for s in row])
        # Fetch UTF-8 output from the queue ...
        data = self.queue.getvalue()
        data = data.decode("utf-8")
        # ... and reencode it into the target encoding
        data = self.encoder.encode(data)
        # write to the target stream
        self.stream.write(data)
        # empty queue
        self.queue.truncate(0)

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)


def _collect_key_names(nodes):
    keys = []
    for node in nodes._parse_tree:
        if isinstance(node, pystache.parser._EscapeNode):
            keys.append(node.key)
        elif isinstance(node, pystache.parser._SectionNode):
            keys.append(node.key)
            keys.extend(_collect_key_names(node.parsed))

    return distinct(keys)


def collect_query_parameters(query):
    nodes = pystache.parse(query)
    keys = _collect_key_names(nodes)
    return keys


def collect_parameters_from_request(args):
    parameters = {}

    for k, v in args.iteritems():
        if k.startswith('p_'):
            parameters[k[2:]] = v

    return parameters


def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST


