import { extend, map, filter } from 'lodash';
import moment from 'moment';
import React from 'react';
import { react2angular } from 'react2angular';
import classNames from 'classnames';
import TimeAgo from 'react-timeago';
import { BigMessage } from '@/components/BigMessage';
import ItemsList from '@/pages/ItemsList';
import settingsMenu from '@/services/settingsMenu';
import { $location, $rootScope } from '@/services/ng';
import { currentUser } from '@/services/auth';
import { policy } from '@/services/policy';
import { User } from '@/services/user';

class UsersList extends ItemsList {
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
      render: (text, user) => <TimeAgo date={user.created_at.toDate()} />,
    },
    {
      title: 'Last Active At',
      field: 'active_at',
      width: '1%',
      className: 'text-nowrap',
      sorter: true,
      render: (text, user) => (user.active_at ? <TimeAgo date={user.active_at.toDate()} /> : null),
    },
    {
      width: '1%',
      className: 'text-nowrap',
      render: (text, user, self) => {
        if (user.id !== currentUser.id) {
          if (user.is_invitation_pending) {
            return (
              <button type="button" className="btn btn-default" onClick={event => self.deleteUser(event, user)}>Delete</button>
            );
          }
          return user.is_disabled ? (
            <button type="button" className="btn btn-primary" onClick={event => self.enableUser(event, user)}>Enable</button>
          ) : (
            <button type="button" className="btn btn-default" onClick={event => self.disableUser(event, user)}>Disable</button>
          );
        }
        return null;
      },
      requireAdmin: true,
    },
  ];

  _wrapUserAction(action) {
    return (event, user) => {
      event.preventDefault();
      event.stopPropagation();
      action(user).then(() => {
        this.update();
      });
      // TODO: Error handling - ???
    };
  }

  constructor(props) {
    super(props);

    this.enableUser = this._wrapUserAction(User.enableUser);
    this.disableUser = this._wrapUserAction(User.disableUser);
    this.deleteUser = this._wrapUserAction(User.deleteUser);

    this._resource = User.query.bind(User);
  }

  // eslint-disable-next-line class-methods-use-this
  onRowClick(event, user) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      // keep default browser behavior
      return;
    }
    event.preventDefault();
    $location.url('users/' + user.id);
    $rootScope.$applyAsync();
  }

  getListColumns() {
    return filter(
      super.getListColumns(),
      column => !column.requireAdmin || (column.requireAdmin && currentUser.isAdmin),
    );
  }

  getRequest(...args) {
    const request = super.getRequest(...args);
    if (this.props.currentPage === 'disabled') {
      request.disabled = true;
    }
    return request;
  }

  doRequest(request) {
    return this._resource(request).$promise;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map((user) => {
      user.created_at = moment(user.created_at);
      user.active_at = moment(user.active_at);
      if (!user.active_at.isValid()) {
        user.active_at = null;
      }
      return new User(user);
    });
    this.state.paginator.updateRows(rows, data.count);

    const isEmpty = data.count === 0;
    let emptyType = null;
    if (isEmpty) {
      if (this.isInSearchMode) {
        emptyType = 'search';
      } else if (this.state.selectedTags.length > 0) {
        emptyType = 'tags';
      } else {
        emptyType = this.props.currentPage;
      }
    }

    this.setState({ isEmpty, emptyType });
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

  // eslint-disable-next-line class-methods-use-this
  renderEmptyState() {
    return (
      <BigMessage message="Sorry, we couldn't find anything." icon="fa-search" />
    );
  }

  renderSearchInput() {
    return super.renderSearchInput('Search...');
  }

  renderSidebar() {
    return (
      <React.Fragment>
        {this.renderSearchInput()}
        {currentUser.isAdmin && this.renderSidebarMenu()}
        {this.renderPageSizeSelect()}
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
