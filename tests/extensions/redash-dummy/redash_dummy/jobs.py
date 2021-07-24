from datetime import timedelta


def job_callback():
    return "result"


def periodic_job(*args, **kwargs):
    """This periodic job will successfully load"""
    return {
        "func": job_callback,
        "timeout": 60,
        "interval": timedelta(minutes=1),
    }
