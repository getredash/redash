module_attribute = "hello!"


def extension(app):
    """This extension will work"""
    return "extension loaded"


def assertive_extension(app):
    """This extension won't work"""
    assert False


def periodic_job(*args, **kwargs):
    """This periodic job will successfully load"""
