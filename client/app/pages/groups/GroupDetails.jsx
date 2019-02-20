import { isBoolean, filter, some, map } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Divider from 'antd/lib/divider';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import Modal from 'antd/lib/modal';
import Tooltip from 'antd/lib/tooltip';

import { EditInPlace } from '@/components/EditInPlace';
import { Paginator } from '@/components/Paginator';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import * as Sidebar from '@/components/items-list/components/Sidebar';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';
import SelectItemsDialog from '@/components/SelectItemsDialog';
import { UserPreviewCard, DataSourcePreviewCard } from '@/components/PreviewCard';

import { $http, $rootScope, $location, toastr } from '@/services/ng';
import { currentUser } from '@/services/auth';
import { Group } from '@/services/group';
import { User } from '@/services/user';
import { DataSource } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

function renderAddon(isSelected, isStaged, alreadyInGroup) {
  if (isStaged) {
    return <i className="fa fa-remove" />;
  }
  if (alreadyInGroup) {
    return <Tooltip title="Already in this group"><i className="fa fa-question-circle" /></Tooltip>;
  }
  return isSelected ? <i className="fa fa-check" /> : <i className="fa fa-angle-double-right" />;
}

class GroupDetails extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  sidebarMenu = [
    {
      key: 'users',
      href: `groups/${this.props.controller.params.groupId}`,
      title: 'Members',
    },
    {
      key: 'datasources',
      href: `groups/${this.props.controller.params.groupId}/data_sources`,
      title: 'Data Sources',
    },
  ];

  usersListColumns = [
    Columns.custom((text, user) => (
      <UserPreviewCard user={user} withLink />
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.custom((text, user) => {
      // cannot remove self from built-in groups
      if ((this.state.group.type === 'builtin') && (currentUser.id === user.id)) {
        return null;
      }
      return <Button className="w-100" type="danger" onClick={event => this.removeGroupMember(event, user)}>Remove</Button>;
    }, {
      width: '1%',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  datasourcesListColumns = [
    Columns.custom((text, datasource) => (
      <DataSourcePreviewCard dataSource={datasource} withLink />
    ), {
      title: 'Name',
      field: 'name',
      width: null,
    }),
    Columns.custom((text, datasource) => {
      const menu = (
        <Menu
          selectedKeys={[datasource.view_only ? 'viewonly' : 'full']}
          onClick={item => this.setDataSourcePermissions(item.domEvent, datasource, item.key)}
        >
          <Menu.Item key="full">Full Access</Menu.Item>
          <Menu.Item key="viewonly">View Only</Menu.Item>
        </Menu>
      );

      const cancelEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };

      return (
        <Dropdown trigger={['click']} overlay={menu}>
          <Button className="w-100" onClick={cancelEvent}>
            {datasource.view_only ? 'View Only' : 'Full Access'} <Icon type="down" />
          </Button>
        </Dropdown>
      );
    }, {
      width: '1%',
      className: 'p-r-0',
      isAvailable: () => currentUser.isAdmin,
    }),
    Columns.custom((text, datasource) => (
      <Button className="w-100" type="danger" onClick={event => this.removeGroupDataSource(event, datasource)}>Remove</Button>
    ), {
      width: '1%',
      isAvailable: () => currentUser.isAdmin,
    }),
  ];

  state = {
    group: null,
    canEdit: false,
    canRemove: false,
    canAddMembers: false,
    canAddDashboards: false,
  };

  componentDidMount() {
    Group.get({ id: this.props.controller.params.groupId }).$promise.then((group) => {
      this.setState({
        group,
        canEdit: currentUser.isAdmin && (group.type !== 'builtin'),
        canRemove: currentUser.isAdmin && (group.type !== 'builtin'),
        canAddMembers: currentUser.isAdmin,
        canAddDashboards: currentUser.isAdmin,
      });
    });
  }

  onTableRowClick = ({
    users: (event, item) => navigateTo('users/' + item.id),
    datasources: (event, item) => navigateTo('data_sources/' + item.id),
  }[this.props.controller.params.currentPage]);

  removeGroupMember = (event, user) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    const { group } = this.state;
    $http.delete(`api/groups/${group.id}/members/${user.id}`).success(() => {
      this.props.controller.update();
    });
  };

  removeGroupDataSource = (event, datasource) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    const { group } = this.state;
    $http.delete(`api/groups/${group.id}/data_sources/${datasource.id}`).success(() => {
      this.props.controller.update();
    });
  };

  setDataSourcePermissions = (event, datasource, permission) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    const viewOnly = permission !== 'full';

    const { group } = this.state;
    $http.post(`api/groups/${group.id}/data_sources/${datasource.id}`, { view_only: viewOnly }).success(() => {
      datasource.view_only = viewOnly;
      this.forceUpdate();
    });
  };

  updateGroupName = (name) => {
    this.state.group.name = name;
    this.state.group.$save();
    this.forceUpdate();
  };

  deleteGroup = () => {
    Modal.confirm({
      title: 'Delete Group',
      content: 'Are you sure you want to delete this group?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: () => {
        this.state.group.$delete(() => {
          $location.path('/groups').replace();
          $rootScope.$applyAsync();
          toastr.success('Group deleted successfully.');
        });
      },
    });
  };

  addMember() {
    SelectItemsDialog.showModal({
      dialogTitle: 'Add Members',
      inputPlaceholder: 'Search users...',
      selectedItemsTitle: 'Users to be added',
      searchItems: searchTerm => User.query({ q: searchTerm }).$promise.then(({ results }) => results),
      renderItem: (item, { isSelected }) => {
        const groupId = parseInt(this.props.controller.params.groupId, 10);
        const alreadyInGroup = some(item.groups, g => g.id === groupId);

        return {
          content: (
            <UserPreviewCard user={item}>
              {renderAddon(isSelected, false, alreadyInGroup)}
            </UserPreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected ? 'selected' : '',
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <UserPreviewCard user={item}>
            {renderAddon(isSelected, true, false)}
          </UserPreviewCard>
        ),
      }),
      save: (items) => {
        const groupId = this.props.controller.params.groupId;
        const promises = map(items, u => $http.post(`api/groups/${groupId}/members`, { user_id: u.id }));
        return Promise.all(promises);
      },
    }).result.then(() => {
      this.props.controller.update();
    });
  }

  addDataSources() {
    const allDataSources = DataSource.query({ extended: true }).$promise;
    SelectItemsDialog.showModal({
      dialogTitle: 'Add Data Sources',
      inputPlaceholder: 'Search data sources...',
      selectedItemsTitle: 'Data sources to be added',
      searchItems: (searchTerm) => {
        searchTerm = searchTerm.toLowerCase();
        return allDataSources.then(items => filter(items, ds => ds.name.toLowerCase().includes(searchTerm)));
      },
      renderItem: (item, { isSelected }) => {
        const groupId = parseInt(this.props.controller.params.groupId, 10);
        const alreadyInGroup = isBoolean(item.groups[groupId]);

        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              {renderAddon(isSelected, false, alreadyInGroup)}
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected ? 'selected' : '',
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            {renderAddon(isSelected, true, false)}
          </DataSourcePreviewCard>
        ),
      }),
      save: (items) => {
        const groupId = this.props.controller.params.groupId;
        const promises = map(items, ds => $http.post(`api/groups/${groupId}/data_sources`, { data_source_id: ds.id }));
        return Promise.all(promises);
      },
    }).result.then(() => {
      this.props.controller.update();
    });
  }

  renderSidebar() {
    const { controller } = this.props;
    const { canAddMembers, canAddDashboards, canRemove } = this.state;
    return (
      <React.Fragment>
        <Sidebar.Menu items={this.sidebarMenu} selected={controller.params.currentPage} />
        <Sidebar.PageSizeSelect
          options={controller.pageSizeOptions}
          value={controller.itemsPerPage}
          onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
        />
        {canAddMembers && (controller.params.currentPage === 'users') && (
          <Button className="w-100 m-t-5" onClick={() => this.addMember()}>Add Members</Button>
        )}
        {canAddDashboards && (controller.params.currentPage === 'datasources') && (
          <Button className="w-100 m-t-5" onClick={() => this.addDataSources()}>Add Data Sources</Button>
        )}
        {canRemove && (
          <React.Fragment>
            <Divider dashed className="m-t-10 m-b-10" />
            <Button className="w-100 m-b-15" type="danger" onClick={this.deleteGroup}>Delete Group</Button>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  render() {
    const { controller } = this.props;
    const { group, canEdit } = this.state;
    const sidebar = this.renderSidebar();

    const listColumns = {
      users: this.usersListColumns,
      datasources: this.datasourcesListColumns,
    }[controller.params.currentPage];

    return (
      <div className="row" data-test="Group">
        {group && (
          <h3 className="col-xs-12 m-t-0 m-b-15">
            <EditInPlace
              className="edit-in-place"
              isEditable={canEdit}
              ignoreBlanks
              editor="input"
              onDone={this.updateGroupName}
              value={group.name}
            />
          </h3>
        )}
        <div className="col-md-3 list-control-t">{sidebar}</div>
        <div className="list-content col-md-9">
          {!controller.isLoaded && <LoadingState className="" />}
          {controller.isLoaded && controller.isEmpty && <EmptyState className="" />}
          {
            controller.isLoaded && !controller.isEmpty && (
              <div className="table-responsive">
                <ItemsTable
                  items={controller.pageItems}
                  columns={listColumns}
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
  ngModule.component('pageGroupDetails', react2angular(liveItemsList(
    GroupDetails,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest(unused, { params: { groupId } }) {
        return { id: groupId };
      },
      getResource({ params: { currentPage } }) {
        return {
          users: Group.members.bind(Group),
          datasources: Group.dataSources.bind(Group),
        }[currentPage];
      },
      getItemProcessor({ params: { currentPage } }) {
        const Model = {
          users: User,
          datasources: DataSource,
        }[currentPage];
        return (item => new Model(item));
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
    {
      path: '/groups/:groupId/data_sources',
      title: 'Group Data Sources',
      key: 'datasources',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-group-details on-error="handleError"></page-group-details></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
