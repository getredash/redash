from flask import render_template, request, redirect, url_for, flash
from flask_login import current_user, login_user, logout_user

from redash import models, settings
from redash.wsgi import app
from redash.handlers import org_scoped_rule
from redash.authentication.org_resolving import current_org
from redash.authentication.helper import get_login_url


@app.route(org_scoped_rule('/login'), methods=['GET', 'POST'])
def login(org_slug=None):
    index_url = url_for("index", org_slug=org_slug)
    next_path = request.args.get('next', index_url)

    if current_user.is_authenticated:
        return redirect(next_path)

    if not settings.PASSWORD_LOGIN_ENABLED:
        if settings.SAML_LOGIN_ENABLED:
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

    if settings.MULTI_ORG:
        google_auth_url = url_for('google_oauth.authorize_org', next=next_path, org_slug=current_org.slug)
    else:
        google_auth_url = url_for('google_oauth.authorize', next=next_path)

    return render_template("login.html",
                           name=settings.NAME,
                           analytics=settings.ANALYTICS,
                           next=next_path,
                           username=request.form.get('username', ''),
                           show_google_openid=settings.GOOGLE_OAUTH_ENABLED,
                           google_auth_url=google_auth_url,
                           show_saml_login=settings.SAML_LOGIN_ENABLED)


@app.route(org_scoped_rule('/logout'))
def logout(org_slug=None):
    logout_user()
    return redirect(get_login_url())
