import re
import time
from flask import request
from flask_restful import abort
from flask_login import current_user, login_user
from funcy import project
from sqlalchemy.exc import IntegrityError
from disposable_email_domains import blacklist
from funcy import partial

from redash import models
from redash.permissions import require_permission, require_admin_or_owner, is_admin_or_owner, \
    require_permission_or_owner, require_admin
from redash.handlers.base import BaseResource, require_fields, get_object_or_404, paginate, order_results as _order_results

from redash.authentication.account import invite_link_for_user, send_invite_email, send_password_reset_email
from redash.settings import parse_boolean


# Ordering map for relationships
order_map = {
    'name': 'name',
    '-name': '-name',
    'active_at': 'active_at',
    '-active_at': '-active_at',
    'created_at': 'created_at',
    '-created_at': '-created_at',
    'groups': 'group_ids',
    '-groups': '-group_ids',
}

order_results = partial(
    _order_results,
    default_order='-created_at',
    allowed_orders=order_map,
)


def invite_user(org, inviter, user):
    invite_url = invite_link_for_user(user)
    send_invite_email(inviter, user, invite_url, org)


class UserListResource(BaseResource):
    def get_users(self, disabled, pending, search_term):
        if disabled:
            users = models.User.all_disabled(self.current_org)
        else:
            users = models.User.all(self.current_org)

        if pending is not None:
            users = models.User.pending(users, pending)

        if search_term:
            users = models.User.search(users, search_term)
            self.record_event({
                'action': 'search',
                'object_type': 'user',
                'term': search_term,
                'pending': pending,
            })
        else:
            self.record_event({
                'action': 'list',
                'object_type': 'user',
                'pending': pending,
            })

        # order results according to passed order parameter,
        # special-casing search queries where the database
        # provides an order by search rank
        return order_results(users, fallback=bool(search_term))

    @require_permission('list_users')
    def get(self):
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)

        groups = {group.id: group for group in models.Group.all(self.current_org)}

        def serialize_user(user):
            d = user.to_dict()
            user_groups = []
            for group_id in set(d['groups']):
                group = groups.get(group_id)

                if group:
                    user_groups.append({'id': group.id, 'name': group.name})

            d['groups'] = user_groups

            return d

        search_term = request.args.get('q', '')

        disabled = request.args.get('disabled', 'false')  # get enabled users by default
        disabled = parse_boolean(disabled)

        pending = request.args.get('pending', None)  # get both active and pending by default
        if pending is not None:
            pending = parse_boolean(pending)

        users = self.get_users(disabled, pending, search_term)

        return paginate(users, page, page_size, serialize_user)

    @require_admin
    def post(self):
        req = request.get_json(force=True)
        require_fields(req, ('name', 'email'))

        if '@' not in req['email']:
            abort(400, message='Bad email address.')
        name, domain = req['email'].split('@', 1)

        if domain.lower() in blacklist or domain.lower() == 'qq.com':
            abort(400, message='Bad email address.')

        user = models.User(org=self.current_org,
                           name=req['name'],
                           email=req['email'],
                           is_invitation_pending=True,
                           group_ids=[self.current_org.default_group.id])

        try:
            models.db.session.add(user)
            models.db.session.commit()
        except IntegrityError as e:
            if "email" in e.message:
                abort(400, message='Email already taken.')
            abort(500)

        self.record_event({
            'action': 'create',
            'object_id': user.id,
            'object_type': 'user'
        })

        should_send_invitation = 'no_invite' not in request.args
        if should_send_invitation:
            invite_user(self.current_org, self.current_user, user)

        return user.to_dict()


class UserInviteResource(BaseResource):
    @require_admin
    def post(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        invite_url = invite_user(self.current_org, self.current_user, user)

        return user.to_dict()


class UserResetPasswordResource(BaseResource):
    @require_admin
    def post(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        if user.is_disabled:
            abort(404, message='Not found')
        reset_link = send_password_reset_email(user)

        return {
            'reset_link': reset_link,
        }


class UserRegenerateApiKeyResource(BaseResource):
    def post(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        if user.is_disabled:
            abort(404, message='Not found')
        if not is_admin_or_owner(user_id):
            abort(403)

        user.regenerate_api_key()
        models.db.session.commit()

        self.record_event({
            'action': 'regnerate_api_key',
            'object_id': user.id,
            'object_type': 'user'
        })

        return user.to_dict(with_api_key=True)


class UserResource(BaseResource):
    def get(self, user_id):
        require_permission_or_owner('list_users', user_id)
        user = get_object_or_404(models.User.get_by_id_and_org, user_id, self.current_org)

        self.record_event({
            'action': 'view',
            'object_id': user_id,
            'object_type': 'user',
        })

        return user.to_dict(with_api_key=is_admin_or_owner(user_id))

    def post(self, user_id):
        require_admin_or_owner(user_id)
        user = models.User.get_by_id_and_org(user_id, self.current_org)

        req = request.get_json(True)

        params = project(req, ('email', 'name', 'password', 'old_password', 'groups'))

        if 'password' in params and 'old_password' not in params:
            abort(403, message="Must provide current password to update password.")

        if 'old_password' in params and not user.verify_password(params['old_password']):
            abort(403, message="Incorrect current password.")

        if 'password' in params:
            user.hash_password(params.pop('password'))
            params.pop('old_password')

        if 'groups' in params and not self.current_user.has_permission('admin'):
            abort(403, message="Must be admin to change groups membership.")

        if 'email' in params:
            _, domain = params['email'].split('@', 1)

            if domain.lower() in blacklist or domain.lower() == 'qq.com':
                abort(400, message='Bad email address.')

        try:
            self.update_model(user, params)
            models.db.session.commit()

            # The user has updated their email or password. This should invalidate all _other_ sessions,
            # forcing them to log in again. Since we don't want to force _this_ session to have to go
            # through login again, we call `login_user` in order to update the session with the new identity details.
            if current_user.id == user.id:
                login_user(user, remember=True)
        except IntegrityError as e:
            if "email" in e.message:
                message = "Email already taken."
            else:
                message = "Error updating record"

            abort(400, message=message)

        self.record_event({
            'action': 'edit',
            'object_id': user.id,
            'object_type': 'user',
            'updated_fields': params.keys()
        })

        return user.to_dict(with_api_key=is_admin_or_owner(user_id))

    @require_admin
    def delete(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        # admin cannot delete self; current user is an admin (`@require_admin`)
        # so just check user id
        if user.id == current_user.id:
            abort(403, message="You cannot delete your own account. "
                               "Please ask another admin to do this for you.")
        elif not user.is_invitation_pending:
            abort(403, message="You cannot delete activated users. "
                               "Please disable the user instead.")
        models.db.session.delete(user)
        models.db.session.commit()

        return user.to_dict(with_api_key=is_admin_or_owner(user_id))


class UserDisableResource(BaseResource):
    @require_admin
    def post(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        # admin cannot disable self; current user is an admin (`@require_admin`)
        # so just check user id
        if user.id == current_user.id:
            abort(403, message="You cannot disable your own account. "
                               "Please ask another admin to do this for you.")
        user.disable()
        models.db.session.commit()

        return user.to_dict(with_api_key=is_admin_or_owner(user_id))

    @require_admin
    def delete(self, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        user.enable()
        models.db.session.commit()

        return user.to_dict(with_api_key=is_admin_or_owner(user_id))
