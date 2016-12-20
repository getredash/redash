import logging
from flask import render_template

from redash import settings
from redash.tasks import send_mail
from redash.utils import base_url
from redash.models import User
# noinspection PyUnresolvedReferences
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

logger = logging.getLogger(__name__)
serializer = URLSafeTimedSerializer(settings.COOKIE_SECRET)


def invite_token(user):
    return serializer.dumps(str(user.id))


def invite_link_for_user(user):
    token = invite_token(user)
    invite_url = "{}/invite/{}".format(base_url(user.org), token)

    return invite_url


def reset_link_for_user(user):
    token = invite_token(user)
    invite_url = "{}/reset/{}".format(base_url(user.org), token)

    return invite_url


def validate_token(token):
    max_token_age = 60 * 60 * 24 * 7 # 1 week
    return serializer.loads(token, max_age=max_token_age)


def send_invite_email(inviter, invited, invite_url, org):
    context = dict(inviter=inviter, invited=invited, org=org, invite_url=invite_url)
    html_content = render_template('emails/invite.html', **context)
    text_content = render_template('emails/invite.txt', **context)
    subject = u"{} invited you to join Redash".format(inviter.name)

    send_mail.delay([invited.email], subject, html_content, text_content)


def send_password_reset_email(user):
    reset_link = reset_link_for_user(user)
    context = dict(user=user, reset_link=reset_link)
    html_content = render_template('emails/reset.html', **context)
    text_content = render_template('emails/reset.txt', **context)
    subject = u"Reset your password"

    send_mail.delay([user.email], subject, html_content, text_content)
    return reset_link


