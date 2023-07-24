from datetime import datetime
from time import mktime

import parsedatetime

cal = parsedatetime.Calendar()


def parse_human_time(s):
    time_struct, _ = cal.parse(s)
    return datetime.fromtimestamp(mktime(time_struct))
