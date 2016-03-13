import parsedatetime
from time import mktime
from datetime import datetime

cal = parsedatetime.Calendar()


def parse_human_time(s):
    time_struct, _ = cal.parse(s)
    return datetime.fromtimestamp(mktime(time_struct))


