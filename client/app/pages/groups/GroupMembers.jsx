import { some, map } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';

import { Paginator } from '@/components/Paginator';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';
import SelectItemsDialog from '@/components/SelectItemsDialog';
import { UserPreviewCard } from '@/components/PreviewCard';

import GroupName from '@/components/groups/GroupName';
import ListItemAddon from '@/components/groups/ListItemAddon';
import Sidebar from '@/components/groups/DetailsPageSidebar';

import { $http } from '@/services/ng';
import { currentUser } from '@/services/auth';
import { Group } from '@/services/group';
import { User } from '@/services/user';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

class GroupMembers extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  groupId = parseInt(this.props.controller.params.groupId, 10);

  group = null;

  sidebarMenu = [
    {
      key: 'users',
      href: `groups/${this.groupId}`,
      title: 'Members',
    },
    {
      key: 'datasources',
      href: `groups/${this.groupId}/data_sources`,
      title: 'Data Sources',
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  listColumns = [
    Columns.custom((text, user) => (
      <UserPreviewCard user={user} withLink />
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.custom((text, user) => {
      // cannot remove self from built-in groups
      if ((this.group.type === 'builtin') && (currentUser.id === user.id)) {
        return null;
      }
      return <Button className="w-100" type="danger" onClick={event => this.removeGroupMember(event, user)}>Remove</Button>;
    }, {
      width: '1%',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  componentDidMount() {
    Group.get({ id: this.groupId }).$promise.then((group) => {
      this.group = group;
      this.forceUpdate();
    });
  }

  onTableRowClick = (event, item) => navigateTo('users/' + item.id);

  removeGroupMember = (event, user) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    $http.delete(`api/groups/${this.group.id}/members/${user.id}`).success(() => {
      this.props.controller.update();
    });
  };

  addMembers = () => {
    SelectItemsDialog.showModal({
      dialogTitle: 'Add Members',
      inputPlaceholder: 'Search users...',
      selectedItemsTitle: 'New Members',
      searchItems: searchTerm => User.query({ q: searchTerm }).$promise.then(({ results }) => results),
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = some(item.groups, g => g.id === this.groupId);
        return {
          content: (
            <UserPreviewCard user={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </UserPreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? 'selected' : '',
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <UserPreviewCard user={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </UserPreviewCard>
        ),
      }),
      save: (items) => {
        const promises = map(items, u => $http.post(`api/groups/${this.groupId}/members`, { user_id: u.id }));
        return Promise.all(promises);
      },
    }).result.then(() => {
      this.props.controller.update();
    });
  };

  render() {
    const { controller } = this.props;
    const sidebar = (
      <Sidebar
        controller={controller}
        group={this.group}
        items={this.sidebarMenu}
        canAddMembers={currentUser.isAdmin}
        onAddMembersClick={this.addMembers}
        onGroupDeleted={() => navigateTo('/groups', true)}
      />
    );

    return (
      <div className="row" data-test="Group">
        <GroupName className="col-xs-12 m-t-0 m-b-15" group={this.group} onChange={() => this.forceUpdate()} />
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
                  showHeader={false}
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
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageGroupMembers', react2angular(liveItemsList(
    GroupMembers,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest(unused, { params: { groupId } }) {
        return { id: groupId };
      },
      getResource() {
        return Group.members.bind(Group);
      },
      getItemProcessor() {
        return (item => new User(item));
      },
    }),
    new StateStorage({ orderByField: 'name' }),
  )));

  return routesToAngularRoutes([
    {
      path: '/groups/:groupId',
      title: 'Group Members',
      key: 'users',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-group-members on-error="handleError"></page-group-members></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
