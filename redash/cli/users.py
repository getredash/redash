from sys import exit

from click import BOOL, argument, option, prompt
from flask.cli import AppGroup
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.exc import IntegrityError

from redash import models
from redash.handlers.users import invite_user

manager = AppGroup(help="Users management commands.")


def build_groups(org, groups, is_admin):
    if isinstance(groups, basestring):
        groups = groups.split(',')
        groups.remove('')  # in case it was empty string
        groups = [int(g) for g in groups]

    if groups is None:
        groups = [org.default_group.id]

    if is_admin:
        groups += [org.admin_group.id]

    return groups


@manager.command()
@argument('email')
@option('--org', 'organization', default='default',
        help="the organization the user belongs to, (leave blank for "
        "'default').")
def grant_admin(email, organization='default'):
    """
    Grant admin access to user EMAIL.
    """
    try:
        org = models.Organization.get_by_slug(organization)
        admin_group = org.admin_group
        user = models.User.get_by_email_and_org(email, org)

        if admin_group.id in user.group_ids:
            print "User is already an admin."
        else:
            user.group_ids = user.group_ids + [org.admin_group.id]
            models.db.session.add(user)
            models.db.session.commit()
            print "User updated."
    except NoResultFound:
        print "User [%s] not found." % email


@manager.command()
@argument('email')
@argument('name')
@option('--org', 'organization', default='default',
        help="The organization the user belongs to (leave blank for "
        "'default').")
@option('--admin', 'is_admin', is_flag=True, default=False,
        help="set user as admin")
@option('--google', 'google_auth', is_flag=True,
        default=False, help="user uses Google Auth to login")
@option('--password', 'password', default=None,
        help="Password for users who don't use Google Auth "
        "(leave blank for prompt).")
@option('--groups', 'groups', default=None,
        help="Comma separated list of groups (leave blank for "
        "default).")
def create(email, name, groups, is_admin=False, google_auth=False,
           password=None, organization='default'):
    """
    Create user EMAIL with display name NAME.
    """
    print "Creating user (%s, %s) in organization %s..." % (email, name,
                                                            organization)
    print "Admin: %r" % is_admin
    print "Login with Google Auth: %r\n" % google_auth

    org = models.Organization.get_by_slug(organization)
    groups = build_groups(org, groups, is_admin)

    user = models.User(org=org, email=email, name=name, group_ids=groups)
    if not password and not google_auth:
        password = prompt("Password", hide_input=True,
                          confirmation_prompt=True)
    if not google_auth:
        user.hash_password(password)

    try:
        models.db.session.add(user)
        models.db.session.commit()
    except Exception, e:
        print "Failed creating user: %s" % e.message
        exit(1)


@manager.command()
@argument('email')
@option('--org', 'organization', default=None,
        help="The organization the user belongs to (leave blank for all"
        " organizations).")
def delete(email, organization=None):
    """
    Delete user EMAIL.
    """
    if organization:
        org = models.Organization.get_by_slug(organization)
        deleted_count = models.User.query.filter(
            models.User.email == email,
            models.User.org == org.id,
        ).delete()
    else:
        deleted_count = models.User.query.filter(models.User.email == email).delete()
    models.db.session.commit()
    print "Deleted %d users." % deleted_count


@manager.command()
@argument('email')
@argument('password')
@option('--org', 'organization', default=None,
        help="The organization the user belongs to (leave blank for all "
        "organizations).")
def password(email, password, organization=None):
    """
    Resets password for EMAIL to PASSWORD.
    """
    if organization:
        org = models.Organization.get_by_slug(organization)
        user = models.User.query.filter(
            models.User.email == email,
            models.User.org == org,
        ).first()
    else:
        user = models.User.query.filter(models.User.email == email).first()

    if user is not None:
        user.hash_password(password)
        models.db.session.add(user)
        models.db.session.commit()
        print "User updated."
    else:
        print "User [%s] not found." % email
        exit(1)


@manager.command()
@argument('email')
@argument('name')
@argument('inviter_email')
@option('--org', 'organization', default='default',
        help="The organization the user belongs to (leave blank for 'default')")
@option('--admin', 'is_admin', type=BOOL, default=False,
        help="set user as admin")
@option('--groups', 'groups', default=None,
        help="Comma seperated list of groups (leave blank for default).")
def invite(email, name, inviter_email, groups, is_admin=False,
           organization='default'):
    """
    Sends an invitation to the given NAME and EMAIL from INVITER_EMAIL.
    """
    org = models.Organization.get_by_slug(organization)
    groups = build_groups(org, groups, is_admin)
    try:
        user_from = models.User.get_by_email_and_org(inviter_email, org)
        user = models.User(org=org, name=name, email=email, group_ids=groups)
        models.db.session.add(user)
        try:
            models.db.session.commit()
            invite_user(org, user_from, user)
            print "An invitation was sent to [%s] at [%s]." % (name, email)
        except IntegrityError as e:
            if "email" in e.message:
                print "Cannot invite. User already exists [%s]" % email
            else:
                print e
    except NoResultFound:
        print "The inviter [%s] was not found." % inviter_email


@manager.command()
@option('--org', 'organization', default=None,
        help="The organization the user belongs to (leave blank for all"
        " organizations)")
def list(organization=None):
    """List all users"""
    if organization:
        org = models.Organization.get_by_slug(organization)
        users = models.User.query.filter(models.User.org == org)
    else:
        users = models.User.query
    for i, user in enumerate(users):
        if i > 0:
            print "-" * 20

        print "Id: {}\nName: {}\nEmail: {}\nOrganization: {}".format(
            user.id, user.name.encode('utf-8'), user.email, user.org.name)
