import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import classNames from 'classnames';

import { Paginator } from '@/components/Paginator';

import LiveItemsList from '@/components/items-list/LiveItemsList';
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
    currentPage: PropTypes.string.isRequired,
  };

  static routes = [
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
  ];

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
      className: 'p-l-0',
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
            <button type="button" className="btn btn-default" onClick={event => context.deleteUser(event, user)}>Delete</button>
          );
        }
        return user.is_disabled ? (
          <button type="button" className="btn btn-primary" onClick={event => context.enableUser(event, user)}>Enable</button>
        ) : (
          <button type="button" className="btn btn-default" onClick={event => context.disableUser(event, user)}>Disable</button>
        );
      }
      return null;
    }, {
      className: 'p-r-0',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  constructor(props) {
    super(props);

    const wrapUserAction = action => (
      (event, user) => {
        event.preventDefault();
        event.stopPropagation();
        action(user).then(() => {
          this.controller.update();
        });
        // TODO: Error handling - ???
      }
    );

    this.actions = {
      enableUser: wrapUserAction(User.enableUser),
      disableUser: wrapUserAction(User.disableUser),
      deleteUser: wrapUserAction(User.deleteUser),
    };

    const resource = User.query.bind(User);

    this.controller = new LiveItemsList({
      getRequest: (request) => {
        if (this.props.currentPage === 'disabled') {
          request.disabled = true;
        }
        return request;
      },
      doRequest: request => resource(request).$promise
        .then(({ results, count }) => ({
          count,
          results: map(results, item => new User(item)),
        })),
      onChange: ({ state }) => this.setState(state),
    });
    this.state = this.controller.state;

    this.onTableRowClick = (event, item) => navigateTo('users/' + item.id);
  }

  componentDidMount() {
    this.controller.update();
  }

  renderSidebar() {
    return (
      <React.Fragment>
        <Sidebar.SearchInput
          value={this.state.searchTerm}
          onChange={this.controller.updateSearch}
        />
        <Sidebar.Menu items={this.constructor.sidebarMenu} selected={this.props.currentPage} />
        <Sidebar.PageSizeSelect
          options={this.state.pageSizeOptions}
          value={this.state.itemsPerPage}
          onChange={itemsPerPage => this.controller.updatePagination({ itemsPerPage })}
        />
      </React.Fragment>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderPageHeader() {
    if (policy.canCreateUser()) {
      // TODO: <users-list-extra></users-list-extra>
      return (
        <div className="m-b-10">
          <a
            href="users/new"
            className={classNames('btn', 'btn-default', 'm-b-10', { disabled: !policy.isCreateUserEnabled() })}
          >
            <i className="fa fa-plus m-r-5" />
            New User
          </a>
        </div>
      );
    }
    return null;
  }

  render() {
    const sidebar = this.renderSidebar();

    return (
      <React.Fragment>
        {this.renderPageHeader()}
        <div className="row">
          <div className="col-md-3 list-control-t">{sidebar}</div>
          <div className="list-content col-md-9">
            {!this.state.isLoaded && <LoadingState className="" />}
            {this.state.isLoaded && this.state.isEmpty && <EmptyState className="" />}
            {
              this.state.isLoaded && !this.state.isEmpty && (
                <div>
                  <ItemsTable
                    items={this.state.pageItems}
                    columns={this.constructor.listColumns}
                    onRowClick={this.onTableRowClick}
                    context={this.actions}
                    orderByField={this.state.orderByField}
                    orderByReverse={this.state.orderByReverse}
                    toggleSorting={this.controller.toggleSorting}
                  />
                  <Paginator
                    totalCount={this.state.totalItemsCount}
                    itemsPerPage={this.state.itemsPerPage}
                    page={this.state.page}
                    onChange={page => this.controller.updatePagination({ page })}
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

  ngModule.component('pageUsersList', react2angular(UsersList));

  return routesToAngularRoutes(UsersList.routes, {
    template: '<settings-screen><page-users-list current-page="$resolve.currentPage"></page-users-list></settings-screen>',
    reloadOnSearch: false,
  });
}

init.init = true;
