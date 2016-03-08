from flask_script import Manager, prompt_pass
from redash import models

manager = Manager(help="Users management commands. This commands assume single organization operation.")


@manager.option('email', help="email address of the user to grant admin to")
def grant_admin(email):
    try:
        org = models.Organization.get_by_slug('default')
        admin_group = org.admin_group
        user = models.User.get_by_email_and_org(email, org)

        if admin_group.id in user.groups:
            print "User is already an admin."
        else:
            user.groups.append(org.admin_group.id)
            user.save()

            print "User updated."
    except models.User.DoesNotExist:
        print "User [%s] not found." % email


@manager.option('email', help="User's email")
@manager.option('name', help="User's full name")
@manager.option('--admin', dest='is_admin', action="store_true", default=False, help="set user as admin")
@manager.option('--google', dest='google_auth', action="store_true", default=False, help="user uses Google Auth to login")
@manager.option('--password', dest='password', default=None, help="Password for users who don't use Google Auth (leave blank for prompt).")
@manager.option('--groups', dest='groups', default=None, help="Comma seperated list of groups (leave blank for default).")
def create(email, name, groups, is_admin=False, google_auth=False, password=None):
    print "Creating user (%s, %s)..." % (email, name)
    print "Admin: %r" % is_admin
    print "Login with Google Auth: %r\n" % google_auth

    org = models.Organization.get_by_slug('default')
    if isinstance(groups, basestring):
        groups= groups.split(',')
        groups.remove('') # in case it was empty string
        groups = [int(g) for g in groups]

    if groups is None:
        groups = [models.Group.get(models.Group.name=="default", models.Group.org==org).id]

    if is_admin:
        groups += [models.Group.get(models.Group.name=="admin", models.Group.org==org).id]

    user = models.User(org=org, email=email, name=name, groups=groups)
    if not google_auth:
        password = password or prompt_pass("Password")
        user.hash_password(password)

    try:
        user.save()
    except Exception, e:
        print "Failed creating user: %s" % e.message


@manager.option('email', help="email address of user to delete")
def delete(email):
    deleted_count = models.User.delete().where(models.User.email == email).execute()
    print "Deleted %d users." % deleted_count


@manager.option('password', help="new password for the user")
@manager.option('email', help="email address of the user to change password for")
def password(email, password):
    try:
        user = models.User.get_by_email_and_org(email, models.Organization.get_by_slug('default'))

        user.hash_password(password)
        user.save()

        print "User updated."
    except models.User.DoesNotExist:
        print "User [%s] not found." % email


@manager.command
def list():
    """List all users"""
    for i, user in enumerate(models.User.select()):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nEmail: {}".format(user.id, user.name.encode('utf-8'), user.email)
