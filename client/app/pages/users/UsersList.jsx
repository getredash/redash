import { isFunction, extend, map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import classNames from 'classnames';

import ItemsListContext from '@/components/items-list/ItemsListContext';

import LiveItemsList from '@/components/items-list/LiveItemsList';
import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable from '@/components/items-list/components/ItemsTable';

import { TimeAgo } from '@/components/TimeAgo';
import settingsMenu from '@/services/settingsMenu';
import { currentUser } from '@/services/auth';
import { policy } from '@/services/policy';
import { User } from '@/services/user';
import navigateTo from '@/services/navigateTo';

class UsersList extends React.Component {
  static propTypes = {
    currentPage: PropTypes.string.isRequired,
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
    {
      title: 'Name',
      field: 'name',
      sorter: true,
      render: (text, user) => (
        <div className="d-flex align-items-center">
          <img src={user.profile_image_url} height="32px" className="profile__image--settings m-r-5" alt={user.name} />
          <div>
            <a href={'users/' + user.id} className="{'text-muted': user.is_disabled}">{user.name}</a>
            <div className="text-muted">{user.email}</div>
            {user.is_invitation_pending && <span className="label label-tag-archived">Invitation Pending</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Groups',
      field: 'groups',
      sorter: true,
      render: (text, user) => map(user.groups, group => (
        <a key={'group' + group.id} className="label label-tag" href={'groups/' + group.id}>{group.name}</a>
      )),
    },
    {
      title: 'Joined',
      field: 'created_at',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: (text, user) => <TimeAgo date={user.created_at} />,
    },
    {
      title: 'Last Active At',
      field: 'active_at',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: (text, user) => (user.active_at ? <TimeAgo date={user.active_at} /> : null),
    },
    {
      width: '1%',
      className: 'text-nowrap',
      render: (text, user, context) => {
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
      },
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  constructor(props) {
    super(props);

    this.updateList = () => {};

    const wrapUserAction = action => (
      (event, user) => {
        event.preventDefault();
        event.stopPropagation();
        action(user).then(() => {
          this.updateList();
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
    this.doRequest = request => resource(request).$promise
      .then(({ results, count }) => ({
        count,
        results: map(results, item => new User(item)),
      }));

    this.getRequest = (request) => {
      if (this.props.currentPage === 'disabled') {
        request.disabled = true;
      }
      return request;
    };

    this.onTableRowClick = (event, item) => navigateTo('users/' + item.id);
  }

  saveCurrentContext(context) {
    this.updateList = isFunction(context.update) ? context.update : () => {};
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
    const sidebar = (
      <Sidebar
        menuItems={this.constructor.sidebarMenu}
        selectedItem={this.props.currentPage}
      />
    );

    return (
      <LiveItemsList getRequest={this.getRequest} doRequest={this.doRequest}>
        <ItemsListContext.Consumer>
          {context => (
            <React.Fragment>
              {this.saveCurrentContext(context)}
              {this.renderPageHeader()}
              <div className="row">
                <div className="col-md-3 list-control-t">{sidebar}</div>
                <div className="list-content col-md-9">
                  {!context.isLoaded && <LoadingState />}
                  {context.isLoaded && context.isEmpty && <EmptyState />}
                  {context.isLoaded && !context.isEmpty && (
                    <ItemsTable
                      columns={this.constructor.listColumns}
                      context={this.actions}
                      onRowClick={this.onTableRowClick}
                    />
                  )}
                </div>
                <div className="col-md-3 list-control-r-b">{sidebar}</div>
              </div>
            </React.Fragment>
          )}
        </ItemsListContext.Consumer>
      </LiveItemsList>
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

  const route = {
    template: '<settings-screen><page-users-list current-page="$resolve.currentPage"></page-users-list></settings-screen>',
    reloadOnSearch: false,
  };

  return {
    '/users': extend(
      {
        title: 'Users',
        resolve: {
          currentPage: () => 'active',
        },
      },
      route,
    ),
    '/users/disabled': extend(
      {
        title: 'Disabled Users',
        resolve: {
          currentPage: () => 'disabled',
        },
      },
      route,
    ),
  };
}

init.init = true;
