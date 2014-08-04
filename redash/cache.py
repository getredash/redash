from flask import make_response
from functools import update_wrapper

ONE_YEAR = 60 * 60 * 24 * 365.25

headers = {
  'Cache-Control': 'max-age=%d' % ONE_YEAR
}
