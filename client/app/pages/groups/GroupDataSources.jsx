import { isBoolean, filter, map } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';

import { Paginator } from '@/components/Paginator';

import { wrap as liveItemsList, ControllerType } from '@/components/items-list/ItemsList';
import { ResourceItemsSource } from '@/components/items-list/classes/ItemsSource';
import { StateStorage } from '@/components/items-list/classes/StateStorage';

import LoadingState from '@/components/items-list/components/LoadingState';
import EmptyState from '@/components/items-list/components/EmptyState';
import ItemsTable, { Columns } from '@/components/items-list/components/ItemsTable';
import SelectItemsDialog from '@/components/SelectItemsDialog';
import { DataSourcePreviewCard } from '@/components/PreviewCard';

import GroupName from '@/components/groups/GroupName';
import ListItemAddon from '@/components/groups/ListItemAddon';
import Sidebar from '@/components/groups/DetailsPageSidebar';

import { $http } from '@/services/ng';
import { currentUser } from '@/services/auth';
import { Group } from '@/services/group';
import { DataSource } from '@/services/data-source';
import navigateTo from '@/services/navigateTo';
import { routesToAngularRoutes } from '@/lib/utils';

class GroupDataSources extends React.Component {
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
    },
  ];

  listColumns = [
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

  componentDidMount() {
    Group.get({ id: this.groupId }).$promise.then((group) => {
      this.group = group;
      this.forceUpdate();
    });
  }

  onTableRowClick = (event, item) => navigateTo('data_sources/' + item.id);

  removeGroupDataSource = (event, datasource) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    $http.delete(`api/groups/${this.group.id}/data_sources/${datasource.id}`).success(() => {
      this.props.controller.update();
    });
  };

  setDataSourcePermissions = (event, datasource, permission) => {
    // prevent default click action on table rows
    event.preventDefault();
    event.stopPropagation();

    const viewOnly = permission !== 'full';

    $http.post(`api/groups/${this.group.id}/data_sources/${datasource.id}`, { view_only: viewOnly }).success(() => {
      datasource.view_only = viewOnly;
      this.forceUpdate();
    });
  };

  addDataSources = () => {
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
        const alreadyInGroup = isBoolean((item.groups || {})[this.groupId]);
        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected ? 'selected' : '',
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </DataSourcePreviewCard>
        ),
      }),
      save: (items) => {
        const promises = map(items, ds => $http.post(`api/groups/${this.groupId}/data_sources`, { data_source_id: ds.id }));
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
        canAddDataSources
        onAddDataSourcesClick={this.addDataSources}
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
  ngModule.component('pageGroupDataSources', react2angular(liveItemsList(
    GroupDataSources,
    new ResourceItemsSource({
      isPlainList: true,
      getRequest(unused, { params: { groupId } }) {
        return { id: groupId };
      },
      getResource() {
        return Group.dataSources.bind(Group);
      },
      getItemProcessor() {
        return (item => new DataSource(item));
      },
    }),
    new StateStorage({ orderByField: 'name' }),
  )));

  return routesToAngularRoutes([
    {
      path: '/groups/:groupId/data_sources',
      title: 'Group Data Sources',
      key: 'datasources',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-group-data-sources on-error="handleError"></page-group-data-sources></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
