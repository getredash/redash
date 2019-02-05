import { map } from 'lodash';
import React from 'react';
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

class UsersList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  static sidebarMenu = [
    {
      key: 'active',
      href: 'users',
      title: 'Active Users',
    },
    {
      key: 'disabled',
      href: 'users/disabled',
      title: 'Disabled Users',
    },
  ];

  static listColumns = [
    Columns.custom.sortable((text, user) => (
      <div className="d-flex align-items-center">
        <img src={user.profile_image_url} height="32px" className="profile__image--settings m-r-5" alt={user.name} />
        <div>
          <a href={'users/' + user.id} className="{'text-muted': user.is_disabled}">{user.name}</a>
          <div className="text-muted">{user.email}</div>
          {user.is_invitation_pending && <span className="label label-tag-archived">Invitation Pending</span>}
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
    Columns.timeAgo.sortable({ title: 'Joined', field: 'created_at' }),
    Columns.timeAgo.sortable({ title: 'Last Active At', field: 'active_at' }),
    Columns.custom((text, user, context) => {
      if (user.id !== currentUser.id) {
        if (user.is_invitation_pending) {
          return (
            <button type="button" className="btn btn-default btn-block" onClick={event => context.deleteUser(event, user)}>Delete</button>
          );
        }
        return user.is_disabled ? (
          <button type="button" className="btn btn-primary btn-block" onClick={event => context.enableUser(event, user)}>Enable</button>
        ) : (
          <button type="button" className="btn btn-default btn-block" onClick={event => context.disableUser(event, user)}>Disable</button>
        );
      }
      return null;
    }, {
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  constructor(props) {
    super(props);

    const wrapUserAction = action => (
      (event, user) => {
        event.preventDefault();
        event.stopPropagation();
        // User service will handle errors, no need to do it here
        action(user).then(() => {
          this.props.controller.update();
        });
      }
    );

    this.actions = {
      enableUser: wrapUserAction(User.enableUser),
      disableUser: wrapUserAction(User.disableUser),
      deleteUser: wrapUserAction(User.deleteUser),
    };
  }

  onTableRowClick = (event, item) => navigateTo('users/' + item.id);

  renderPageHeader(isAdminView) {
    const { controller } = this.props;
    return isAdminView ? (
      // Admin
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
    ) : (
      // Non-admin
      <div className="row m-b-10">
        <div className="col-xs-9 p-r-0">
          <Sidebar.SearchInput
            value={controller.searchTerm}
            showIcon
            onChange={controller.updateSearch}
          />
        </div>
        <div className="col-xs-3">
          <Sidebar.PageSizeSelect
            options={controller.pageSizeOptions}
            value={controller.itemsPerPage}
            onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
          />
        </div>
      </div>
    );
  }

  renderSidebar(isAdminView) {
    if (!isAdminView) {
      return null;
    }
    const { controller } = this.props;
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          value={controller.searchTerm}
          onChange={controller.updateSearch}
        />
        <Sidebar.Menu items={this.constructor.sidebarMenu} selected={controller.currentPage} />
        <Sidebar.PageSizeSelect
          options={controller.pageSizeOptions}
          value={controller.itemsPerPage}
          onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
        />
      </React.Fragment>
    );
  }

  render() {
    const isAdminView = policy.canCreateUser();
    const sidebar = this.renderSidebar(isAdminView);
    const { controller } = this.props;
    return (
      <React.Fragment>
        {this.renderPageHeader(isAdminView)}
        <div className="row">
          {isAdminView && <div className="col-md-3 list-control-t">{sidebar}</div>}
          <div className={isAdminView ? 'list-content col-md-9' : 'col-md-12'}>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && <EmptyState className="" />}
            {
              controller.isLoaded && !controller.isEmpty && (
                <div>
                  <ItemsTable
                    items={controller.pageItems}
                    columns={this.constructor.listColumns}
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
          {isAdminView && <div className="col-md-3 list-control-r-b">{sidebar}</div>}
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
      if (currentPage === 'disabled') {
        request.disabled = true;
      }
      return request;
    },
    doRequest: createResourceFetcher(
      () => User.query.bind(User),
      item => new User(item),
    ),
  })));

  return routesToAngularRoutes([
    {
      path: '/users',
      title: 'Users',
      key: 'active',
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
