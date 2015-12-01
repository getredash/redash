import time
from flask import request
from flask.ext.restful import abort
from redash import models
from redash.wsgi import api
from redash.tasks import record_event
from redash.permissions import require_admin
from redash.handlers.base import BaseResource, get_object_or_404


class GroupListResource(BaseResource):
    @require_admin
    def post(self):
        name = request.json['name']
        group = models.Group.create(name=name, org=self.current_org)

        record_event.delay({
            'user_id': self.current_user.id,
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

        record_event.delay({
            'user_id': self.current_user.id,
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

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'add_member',
            'timestamp': int(time.time()),
            'object_id': group.id,
            'object_type': 'group',
            'member_id': user.id
        })

        return user.to_dict()

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

        record_event.delay({
            'user_id': self.current_user.id,
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

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'add_data_source',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })

        return data_source.to_dict(with_permissions=True)

    @require_admin
    def get(self, group_id):
        group = get_object_or_404(models.Group.get_by_id_and_org, group_id, self.current_org)

        # TOOD: move to models
        data_sources = models.DataSource.select(models.DataSource, models.DataSourceGroup.view_only)\
            .join(models.DataSourceGroup)\
            .where(models.DataSourceGroup.group == group)

        return [ds.to_dict(with_permissions=True) for ds in data_sources]


class GroupDataSourceResource(BaseResource):
    @require_admin
    def post(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)
        view_only = request.json['view_only']

        data_source.update_group_permission(group, view_only)

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'change_data_source_permission',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id,
            'view_only': view_only
        })

        return data_source.to_dict(with_permissions=True)

    @require_admin
    def delete(self, group_id, data_source_id):
        data_source = models.DataSource.get_by_id_and_org(data_source_id, self.current_org)
        group = models.Group.get_by_id_and_org(group_id, self.current_org)

        data_source.remove_group(group)

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'remove_data_source',
            'timestamp': int(time.time()),
            'object_id': group_id,
            'object_type': 'group',
            'member_id': data_source.id
        })


api.add_resource(GroupListResource, '/api/groups', endpoint='groups')
api.add_resource(GroupResource, '/api/groups/<group_id>', endpoint='group')
api.add_resource(GroupMemberListResource, '/api/groups/<group_id>/members', endpoint='group_members')
api.add_resource(GroupMemberResource, '/api/groups/<group_id>/members/<user_id>', endpoint='group_member')
api.add_resource(GroupDataSourceListResource, '/api/groups/<group_id>/data_sources', endpoint='group_data_sources')
api.add_resource(GroupDataSourceResource, '/api/groups/<group_id>/data_sources/<data_source_id>', endpoint='group_data_source')
