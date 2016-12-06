import time
from flask import request
from flask_restful import abort
from redash import models
from redash.permissions import require_admin, require_permission
from redash.handlers.base import BaseResource, get_object_or_404


class GroupListResource(BaseResource):
    @require_admin
    def post(self):
        name = request.json['name']
        group = models.Group.create(name=name, org=self.current_org)

        self.record_event({
            'action': 'create',
            'timestamp': int(time.time()),
            'object_id': group.id,
            'object_type': 'group'
        })

        return group.to_dict()

    def get(self):
        if self.current_user.has_permission('admin'):
            groups = models.Group.all(self.current_org)
        else:
            groups = models.Group.select().where(models.Group.id << self.current_user.groups)

        return [g.to_dict() for g in groups]


class GroupResource(BaseResource):
    @require_admin
    def post(self, group_id):
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        if group.type == models.Group.BUILTIN_GROUP:
            abort(400, message="Can't modify built-in groups.")

        group.name = request.json['name']
        group.save()

        self.record_event({
            'action': 'edit',
            'timestamp': int(time.time()),
            'object_id': group.id,
            'object_type': 'group'
        })

        return group.to_dict()

    def get(self, group_id):
        if not (self.current_user.has_permission('admin') or int(group_id) in self.current_user.groups):
            abort(403)

        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        return group.to_dict()

    @require_admin
    def delete(self, group_id):
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        if group.type == models.Group.BUILTIN_GROUP:
            abort(400, message="Can't delete built-in groups.")

        group.delete_instance(recursive=True)


class GroupMemberListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        user_id = request.json['user_id']
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        user.groups.append(group.id)
        user.save()

        self.record_event({
            'action': 'add_member',
            'timestamp': int(time.time()),
            'object_id': group.id,
            'object_type': 'group',
            'member_id': user.id
        })

        return user.to_dict()

    @require_permission('list_users')
    def get(self, group_id):
        if not (self.current_user.has_permission('admin') or int(group_id) in self.current_user.groups):
            abort(403)

        members = models.Group.members(group_id)
        return [m.to_dict() for m in members]


class GroupMemberResource(BaseResource):
    @require_admin
    def delete(self, group_id, user_id):
        user = models.User.get_by_id_and_org(user_id, self.current_org)
        user.groups.remove(int(group_id))
        user.save()

        self.record_event({
            'action': 'remove_member',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': user.id
        })


class GroupDataSourceListResource(BaseResource):
    @require_admin
    def post(self, group_id):
        data_source_id = request.json['data_source_id']
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        data_source.add_group(group)

        self.record_event({
            'action': 'add_data_source',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })

        return data_source.to_dict(with_permissions_for=group)

    @require_admin
    def get(self, group_id):
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)

        # TOOD: move to models
        data_sources = models.DataSource.select(models.DataSource, models.DataSourceGroup.view_only)\
            .join(models.DataSourceGroup)\
            .where(models.DataSourceGroup.group == group)

        return [ds.to_dict(with_permissions_for=group) for ds in data_sources]


class GroupDataSourceResource(BaseResource):
    @require_admin
    def post(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        view_only = request.json['view_only']

        data_source.update_group_permission(group, view_only)

        self.record_event({
            'action': 'change_data_source_permission',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id,
            'view_only': view_only
        })

        return data_source.to_dict(with_permissions_for=group)

    @require_admin
    def delete(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        data_source.remove_group(group)

        self.record_event({
            'action': 'remove_data_source',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })
