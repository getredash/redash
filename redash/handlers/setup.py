from flask import redirect, request, render_template, url_for, g
from flask_login import login_user
from wtforms import Form, PasswordField, StringField, BooleanField, validators
from wtforms.fields.html5 import EmailField

from redash import settings
from redash.tasks.general import subscribe
from redash.handlers.base import routes
from redash.models import Organization, Group, User, db
from redash.authentication.org_resolving import current_org


class SetupForm(Form):
    name = StringField('Name', validators=[validators.InputRequired()])
    email = EmailField('Email Address', validators=[validators.Email()])
    password = PasswordField('Password', validators=[validators.Length(6)])
    org_name = StringField("Organization Name", validators=[validators.InputRequired()])
    security_notifications = BooleanField()
    newsletter = BooleanField()


@routes.route('/setup', methods=['GET', 'POST'])
def setup():
    if current_org != None or settings.MULTI_ORG:
        return redirect('/')

    form = SetupForm(request.form)
    form.newsletter.data = True
    form.security_notifications.data = True

    if request.method == 'POST' and form.validate():
        default_org = Organization(name=form.org_name.data, slug='default', settings={})
        admin_group = Group(name='admin', permissions=['admin', 'super_admin'], org=default_org, type=Group.BUILTIN_GROUP)
        default_group = Group(name='default', permissions=Group.DEFAULT_PERMISSIONS, org=default_org, type=Group.BUILTIN_GROUP)

        db.session.add_all([default_org, admin_group, default_group])
        db.session.commit()

        user = User(org=default_org, name=form.name.data, email=form.email.data, group_ids=[admin_group.id, default_group.id])
        user.hash_password(form.password.data)

        db.session.add(user)
        db.session.commit()

        g.org = default_org
        login_user(user)

        # signup to newsletter if needed
        if form.newsletter.data or form.security_notifications:
            subscribe.delay(form.data)

        return redirect(url_for('redash.index', org_slug=None))

    return render_template('setup.html', form=form)


