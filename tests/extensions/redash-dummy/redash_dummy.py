module_attribute = "hello!"


def extension(app):
    """This extension will work"""
    return "extension loaded"


def assertive_extension(app):
    """This extension won't work"""
    assert False


def periodic_task(*args, **kwargs):
    """This periodic task will successfully load"""
