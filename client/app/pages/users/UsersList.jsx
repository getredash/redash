import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import classNames from 'classnames';

import { Paginator } from '@/components/Paginator';
import DynamicComponent from '@/components/DynamicComponent';

import { wrap as liveItemsList, createResourceFetcher, ControllerType } from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import * as Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';

import settingsMenu from '@/services/settingsMenu';
import { currentUser } from '@/services/auth';
import { policy } from '@/services/policy';
import { User } from '@/services/user';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

function UsersListActions({ user, actions }) {
  if (user.id === currentUser.id) {
    return null;
  }
  const { enableUser, disableUser, deleteUser } = actions;
  if (user.is_invitation_pending) {
    return (
      <button type="button" className="btn btn-default btn-block" onClick={event => deleteUser(event, user)}>Delete</button>
    );
  }
  return user.is_disabled ? (
    <button type="button" className="btn btn-primary btn-block" onClick={event => enableUser(event, user)}>Enable</button>
  ) : (
    <button type="button" className="btn btn-default btn-block" onClick={event => disableUser(event, user)}>Disable</button>
  );
}

UsersListActions.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    is_invitation_pending: PropTypes.bool,
    is_disabled: PropTypes.bool,
  }).isRequired,
  actions: PropTypes.shape({
    enableUser: PropTypes.func,
    disableUser: PropTypes.func,
    deleteUser: PropTypes.func,
  }).isRequired,
};

class UsersList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  sidebarMenu = [
    {
      key: 'active',
      href: 'users',
      title: 'Active Users',
    },
    {
      key: 'pending',
      href: 'users/pending',
      title: 'Pending Invitations',
    },
    {
      key: 'disabled',
      href: 'users/disabled',
      title: 'Disabled Users',
      isAvailable: () => policy.isCreateUserEnabled(),
    },
  ];

  listColumns = [
    Columns.custom.sortable((text, user) => (
      <div className="d-flex align-items-center">
        <img src={user.profile_image_url} height="32px" className="profile__image--settings m-r-5" alt={user.name} />
        <div>
          <a href={'users/' + user.id} className="{'text-muted': user.is_disabled}">{user.name}</a>
          <div className="text-muted">{user.email}</div>
        </div>
      </div>
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.custom.sortable((text, user) => map(user.groups, group => (
      <a key={'group' + group.id} className="label label-tag" href={'groups/' + group.id}>{group.name}</a>
    )), {
      title: 'Groups',
      field: 'groups',
    }),
    Columns.timeAgo.sortable({
      title: 'Joined',
      field: 'created_at',
      className: 'text-nowrap',
      width: '1%',
    }),
    Columns.timeAgo.sortable({
      title: 'Last Active At',
      field: 'active_at',
      className: 'text-nowrap',
      width: '1%',
    }),
    Columns.custom((text, user) => <UsersListActions user={user} actions={this.props.controller.actions} />, {
      width: '1%',
      isAvailable: () => policy.isCreateUserEnabled(),
    }),
  ];

  onTableRowClick = (event, item) => navigateTo('users/' + item.id);

  // eslint-disable-next-line class-methods-use-this
  renderPageHeader() {
    if (!policy.isCreateUserEnabled()) {
      return null;
    }
    return (
      <div className="m-b-10">
        <a
          href="users/new"
          className={classNames('btn', 'btn-default', 'm-b-10', { disabled: !policy.isCreateUserEnabled() })}
        >
          <i className="fa fa-plus m-r-5" />
          New User
        </a>
        <DynamicComponent name="UsersListExtra" />
      </div>
    );
  }

  renderSidebar() {
    const { controller } = this.props;
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          value={controller.searchTerm}
          onChange={controller.updateSearch}
        />
        <Sidebar.Menu items={this.sidebarMenu} selected={controller.currentPage} />
        <Sidebar.PageSizeSelect
          options={controller.pageSizeOptions}
          value={controller.itemsPerPage}
          onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
        />
      </React.Fragment>
    );
  }

  render() {
    const sidebar = this.renderSidebar();
    const { controller } = this.props;
    return (
      <React.Fragment>
        {this.renderPageHeader()}
        <div className="row">
          <div className="col-md-3 list-control-t">{sidebar}</div>
          <div className="list-content col-md-9">
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && <EmptyState className="" />}
            {
              controller.isLoaded && !controller.isEmpty && (
                <div className="table-responsive">
                  <ItemsTable
                    items={controller.pageItems}
                    columns={this.listColumns}
                    onRowClick={this.onTableRowClick}
                    context={this.actions}
                    orderByField={controller.orderByField}
                    orderByReverse={controller.orderByReverse}
                    toggleSorting={controller.toggleSorting}
                  />
                  <Paginator
                    totalCount={controller.totalItemsCount}
                    itemsPerPage={controller.itemsPerPage}
                    page={controller.page}
                    onChange={page => controller.updatePagination({ page })}
                  />
                </div>
              )
            }
          </div>
          <div className="col-md-3 list-control-r-b">{sidebar}</div>
        </div>
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'list_users',
    title: 'Users',
    path: 'users',
    isActive: path => path.startsWith('/users') && (path !== '/users/me'),
    order: 2,
  });

  ngModule.component('pageUsersList', react2angular(liveItemsList(UsersList, {
    defaultOrderBy: '-created_at',
    getRequest(request, { currentPage }) {
      switch (currentPage) {
        case 'active':
          request.pending = false;
          break;
        case 'pending':
          request.pending = true;
          break;
        case 'disabled':
          request.disabled = true;
          break;
        // no default
      }
      return request;
    },
    doRequest: createResourceFetcher(
      () => User.query.bind(User),
      item => new User(item),
    ),
    actions: {
      // `User` will become available later, so use wrappers
      enableUser: (event, user) => {
        // prevent default click action on table rows
        event.preventDefault();
        event.stopPropagation();
        return User.enableUser(user);
      },
      disableUser: (event, user) => {
        // prevent default click action on table rows
        event.preventDefault();
        event.stopPropagation();
        return User.disableUser(user);
      },
      deleteUser: (event, user) => {
        // prevent default click action on table rows
        event.preventDefault();
        event.stopPropagation();
        return User.deleteUser(user);
      },
    },
  })));

  return routesToAngularRoutes([
    {
      path: '/users',
      title: 'Users',
      key: 'active',
    },
    {
      path: '/users/pending',
      title: 'Pending Invitations',
      key: 'pending',
    },
    {
      path: '/users/disabled',
      title: 'Disabled Users',
      key: 'disabled',
    },
  ], {
    template: '<settings-screen><page-users-list current-page="$resolve.currentPage"></page-users-list></settings-screen>',
    reloadOnSearch: false,
  });
}

init.init = true;
