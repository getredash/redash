import parsedatetime
import pytz
from time import mktime
from datetime import datetime
from pytz import timezone

cal = parsedatetime.Calendar()


def parse_human_time(s, tz):
    time_struct, flag = cal.parse(s)

    # don't use timezones with relative datetimes
    if flag == 2:
        return datetime.fromtimestamp(mktime(time_struct))
    else:
        datetime_obj, _ = cal.parseDT(datetimeString=s, tzinfo=timezone(tz))
        return datetime_obj

