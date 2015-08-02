from flask import render_template, request, redirect, session, url_for, flash
from flask_login import current_user, login_user, logout_user

from redash import models, settings
from redash.wsgi import app


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated():
        return redirect(request.args.get('next') or '/')

    if not settings.PASSWORD_LOGIN_ENABLED:
        if settings.SAML_LOGIN_ENABLED:
            return redirect(url_for("saml_auth.sp_initiated", next=request.args.get('next')))
        else:
            return redirect(url_for("google_oauth.authorize", next=request.args.get('next')))

    if request.method == 'POST':
        try:
            user = models.User.get_by_email(request.form['email'])
            if user and user.verify_password(request.form['password']):
                remember = ('remember' in request.form)
                login_user(user, remember=remember)
                return redirect(request.args.get('next') or '/')
            else:
                flash("Wrong email or password.")
        except models.User.DoesNotExist:
            flash("Wrong email or password.")

    return render_template("login.html",
                           name=settings.NAME,
                           analytics=settings.ANALYTICS,
                           next=request.args.get('next'),
                           username=request.form.get('username', ''),
                           show_google_openid=settings.GOOGLE_OAUTH_ENABLED,
                           show_saml_login=settings.SAML_LOGIN_ENABLED)

@app.route('/logout')
def logout():
    logout_user()
    session.pop('openid', None)

    return redirect('/login')
