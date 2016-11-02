import logging
from flask import render_template, request, redirect, url_for, flash
from flask_login import current_user, login_user, logout_user

from redash import models, settings, limiter
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule
from redash.authentication import current_org, get_login_url
from redash.authentication.account import validate_token, BadSignature, SignatureExpired, send_password_reset_email

logger = logging.getLogger(__name__)


def get_google_auth_url(next_path):
    if settings.MULTI_ORG:
        google_auth_url = url_for('google_oauth.authorize_org', next=next_path, org_slug=current_org.slug)
    else:
        google_auth_url = url_for('google_oauth.authorize', next=next_path)
    return google_auth_url


def render_token_login_page(template, org_slug, token):
    try:
        user_id = validate_token(token)
        user = models.User.get_by_id_and_org(user_id, current_org)
    except models.User.DoesNotExist:
        logger.exception("Bad user id in token. Token= , User id= %s, Org=%s", user_id, token, org_slug)
        return render_template("error.html", error_message="Invalid invite link. Please ask for a new one."), 400
    except (SignatureExpired, BadSignature):
        logger.exception("Failed to verify invite token: %s, org=%s", token, org_slug)
        return render_template("error.html",
                               error_message="Your invite link has expired. Please ask for a new one."), 400
    status_code = 200
    if request.method == 'POST':
        if 'password' not in request.form:
            flash('Bad Request')
            status_code = 400
        elif not request.form['password']:
            flash('Cannot use empty password.')
            status_code = 400
        elif len(request.form['password']) < 6:
            flash('Password length is too short (<6).')
            status_code = 400
        else:
            # TODO: set active flag
            user.hash_password(request.form['password'])
            user.save()

            login_user(user)
            return redirect(url_for('redash.index', org_slug=org_slug))
    if settings.GOOGLE_OAUTH_ENABLED:
        google_auth_url = get_google_auth_url(url_for('redash.index', org_slug=org_slug))
    else:
        google_auth_url = ''
    return render_template(template, google_auth_url=google_auth_url, user=user), status_code


@routes.route(org_scoped_rule('/invite/<token>'), methods=['GET', 'POST'])
def invite(token, org_slug=None):
    return render_token_login_page("invite.html", org_slug, token)


@routes.route(org_scoped_rule('/reset/<token>'), methods=['GET', 'POST'])
def reset(token, org_slug=None):
    return render_token_login_page("reset.html", org_slug, token)


@routes.route(org_scoped_rule('/forgot'), methods=['GET', 'POST'])
def forgot_password(org_slug=None):
    submitted = False
    if request.method == 'POST' and request.form['email']:
        submitted = True
        email = request.form['email']
        try:
            user = models.User.get_by_email_and_org(email, current_org)
            send_password_reset_email(user)
        except models.User.DoesNotExist:
            logging.error("No user found for forgot password: %s", email)

    return render_template("forgot.html", submitted=submitted)


@routes.route(org_scoped_rule('/login'), methods=['GET', 'POST'])
@limiter.limit(settings.THROTTLE_LOGIN_PATTERN)
def login(org_slug=None):
    index_url = url_for("redash.index", org_slug=org_slug)
    next_path = request.args.get('next', index_url)

    if current_user.is_authenticated:
        return redirect(next_path)

    if not settings.PASSWORD_LOGIN_ENABLED:
        if settings.REMOTE_USER_LOGIN_ENABLED:
            return redirect(url_for("remote_user_auth.login", next=next_path))
        elif settings.SAML_LOGIN_ENABLED:
            return redirect(url_for("saml_auth.sp_initiated", next=next_path))
        else:
            return redirect(url_for("google_oauth.authorize", next=next_path))

    if request.method == 'POST':
        try:
            user = models.User.get_by_email_and_org(request.form['email'], current_org.id)
            if user and user.verify_password(request.form['password']):
                remember = ('remember' in request.form)
                login_user(user, remember=remember)
                return redirect(next_path)
            else:
                flash("Wrong email or password.")
        except models.User.DoesNotExist:
            flash("Wrong email or password.")

    google_auth_url = get_google_auth_url(next_path)

    return render_template("login.html",
                           org_slug=org_slug,
                           next=next_path,
                           username=request.form.get('username', ''),
                           show_google_openid=settings.GOOGLE_OAUTH_ENABLED,
                           google_auth_url=google_auth_url,
                           show_saml_login=settings.SAML_LOGIN_ENABLED,
                           show_remote_user_login=settings.REMOTE_USER_LOGIN_ENABLED)


@routes.route(org_scoped_rule('/logout'))
def logout(org_slug=None):
    logout_user()
    return redirect(get_login_url(next=None))
