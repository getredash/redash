import logging
logger = logging.getLogger('ldap_auth')

from redash import settings

from flask import flash, redirect, render_template, request, url_for, Blueprint
from flask_login import current_user, login_required, login_user, logout_user

try:
    from ldap3 import Server, Connection, SIMPLE
except ImportError:
    if settings.LDAP_LOGIN_ENABLED:
        logger.error("The ldap3 library was not found. This is required to use LDAP authentication (see requirements.txt).")
        exit()

from redash.authentication.google_oauth import create_and_login_user
from redash.authentication.org_resolving import current_org


blueprint = Blueprint('ldap_auth', __name__)


@blueprint.route("/ldap/login", methods=['GET', 'POST'])
def login(org_slug=None):
    index_url = url_for("redash.index", org_slug=org_slug)
    next_path = request.args.get('next', index_url)

    if not settings.LDAP_LOGIN_ENABLED:
        logger.error("Cannot use LDAP for login without being enabled in settings")
        return redirect(url_for('redash.index', next=next_path))

    if current_user.is_authenticated:
        return redirect(next_path)

    if request.method == 'POST':
        user = auth_ldap_user(request.form['email'], request.form['password'])

        if user is not None:
            create_and_login_user(current_org, user[settings.LDAP_DISPLAY_NAME_KEY][0], user[settings.LDAP_EMAIL_KEY][0])
            return redirect(next_path or url_for('redash.index'))
        else:
            flash("Incorrect credentials.")

    return render_template("login.html",
                           org_slug=org_slug,
                           next=next_path,
                           email=request.form.get('email', ''),
                           show_password_login=True,
                           username_prompt=settings.LDAP_CUSTOM_USERNAME_PROMPT,
                           hide_forgot_password=True)


def auth_ldap_user(username, password):
    server = Server(settings.LDAP_HOST_URL)
    conn = Connection(server, settings.LDAP_BIND_DN, password=settings.LDAP_BIND_DN_PASSWORD, authentication=SIMPLE, auto_bind=True)

    conn.search(settings.LDAP_SEARCH_DN, settings.LDAP_SEARCH_TEMPLATE % {"username": username}, attributes=[settings.LDAP_DISPLAY_NAME_KEY, settings.LDAP_EMAIL_KEY])

    if len(conn.entries) == 0:
        return None

    user = conn.entries[0]

    if not conn.rebind(user=user.entry_dn, password=password):
        return None

    return user
