import logging

from flask import flash, redirect, render_template, request, url_for, Blueprint
from ldap3 import Server, Connection, ALL, NTLM, SIMPLE
from ldap3.core.exceptions import LDAPBindError, LDAPException
from flask_login import current_user, login_required, login_user, logout_user

from redash import settings
from redash.authentication.google_oauth import create_and_login_user
from redash.authentication.org_resolving import current_org


logger = logging.getLogger('ldap_auth')

blueprint = Blueprint('ldap_auth', __name__)


@blueprint.route("/ldap_auth/login", methods=['GET', 'POST'])
def login(org_slug=None):
    index_url = url_for("redash.index", org_slug=org_slug)
    next_path = request.args.get('next', index_url)

    if not settings.LDAP_LOGIN_ENABLED:
        logger.error("Cannot use LDAP for login without being enabled in settings")
        return redirect(url_for('redash.index', next=next_path))

    if current_user.is_authenticated:
        return redirect(next_path)

    if request.method == 'POST':
        try:
            server = Server(settings.LDAP_HOST_URL)
            conn = Connection(server, settings.LDAP_NAMESPACE+request.form['email'], password=request.form['password'], authentication=settings.LDAP_AUTHENTICATION_METHOD, auto_bind=True)

            conn.search(settings.LDAP_BIND_DN, '(' + settings.LDAP_UID_KEY + '=' + request.form['email'] + ')', attributes=[settings.LDAP_DISPLAY_NAME_KEY, settings.LDAP_EMAIL_KEY])

            if conn.entries[0] is not None:
                user = create_and_login_user(current_org, conn.entries[0][settings.LDAP_DISPLAY_NAME_KEY].value, conn.entries[0][settings.LDAP_EMAIL_KEY].value)
                return redirect(next_path or url_for('redash.index'))
            else:
                flash("Incorrect credentials.")
        except LDAPBindError:
            flash("Incorrect credentials.")
        except LDAPException:
            logging.exception("Unkown error connecting to LDAP.")
            flash("Error connecting to LDAP.")

    return render_template("login.html",
                           org_slug=org_slug,
                           next=next_path,
                           email=request.form.get('email', ''),
                           username_prompt=settings.LDAP_CUSTOM_USERNAME_PROMPT)
