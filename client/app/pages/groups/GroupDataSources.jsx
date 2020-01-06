import { filter, map, includes } from "lodash";
import React from "react";
import { react2angular } from "react2angular";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Icon from "antd/lib/icon";

import Paginator from "@/components/Paginator";

import { wrap as liveItemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import SelectItemsDialog from "@/components/SelectItemsDialog";
import { DataSourcePreviewCard } from "@/components/PreviewCard";

import GroupName from "@/components/groups/GroupName";
import ListItemAddon from "@/components/groups/ListItemAddon";
import Sidebar from "@/components/groups/DetailsPageSidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";

import notification from "@/services/notification";
import { currentUser } from "@/services/auth";
import { Group } from "@/services/group";
import { DataSource } from "@/services/data-source";
import navigateTo from "@/services/navigateTo";
import { routesToAngularRoutes } from "@/lib/utils";

class GroupDataSources extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  groupId = parseInt(this.props.controller.params.groupId, 10);

  group = null;

  sidebarMenu = [
    {
      key: "users",
      href: `groups/${this.groupId}`,
      title: "Members",
    },
    {
      key: "datasources",
      href: `groups/${this.groupId}/data_sources`,
      title: "Data Sources",
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  listColumns = [
    Columns.custom((text, datasource) => <DataSourcePreviewCard dataSource={datasource} withLink />, {
      title: "Name",
      field: "name",
      width: null,
    }),
    Columns.custom(
      (text, datasource) => {
        const menu = (
          <Menu
            selectedKeys={[datasource.view_only ? "viewonly" : "full"]}
            onClick={item => this.setDataSourcePermissions(datasource, item.key)}>
            <Menu.Item key="full">Full Access</Menu.Item>
            <Menu.Item key="viewonly">View Only</Menu.Item>
          </Menu>
        );

        return (
          <Dropdown trigger={["click"]} overlay={menu}>
            <Button className="w-100">
              {datasource.view_only ? "View Only" : "Full Access"}
              <Icon type="down" />
            </Button>
          </Dropdown>
        );
      },
      {
        width: "1%",
        className: "p-r-0",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
    Columns.custom(
      (text, datasource) => (
        <Button className="w-100" type="danger" onClick={() => this.removeGroupDataSource(datasource)}>
          Remove
        </Button>
      ),
      {
        width: "1%",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
  ];

  componentDidMount() {
    Group.get({ id: this.groupId })
      .$promise.then(group => {
        this.group = group;
        this.forceUpdate();
      })
      .catch(error => {
        this.props.controller.handleError(error);
      });
  }

  removeGroupDataSource = datasource => {
    Group.removeDataSource({ id: this.groupId, dataSourceId: datasource.id })
      .$promise.then(() => {
        this.props.controller.updatePagination({ page: 1 });
        this.props.controller.update();
      })
      .catch(() => {
        notification.error("Failed to remove data source from group.");
      });
  };

  setDataSourcePermissions = (datasource, permission) => {
    const viewOnly = permission !== "full";

    Group.updateDataSource({ id: this.groupId, dataSourceId: datasource.id }, { view_only: viewOnly })
      .$promise.then(() => {
        datasource.view_only = viewOnly;
        this.forceUpdate();
      })
      .catch(() => {
        notification.error("Failed change data source permissions.");
      });
  };

  addDataSources = () => {
    const allDataSources = DataSource.query().$promise;
    const alreadyAddedDataSources = map(this.props.controller.allItems, ds => ds.id);
    SelectItemsDialog.showModal({
      dialogTitle: "Add Data Sources",
      inputPlaceholder: "Search data sources...",
      selectedItemsTitle: "New Data Sources",
      searchItems: searchTerm => {
        searchTerm = searchTerm.toLowerCase();
        return allDataSources.then(items => filter(items, ds => ds.name.toLowerCase().includes(searchTerm)));
      },
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = includes(alreadyAddedDataSources, item.id);
        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? "selected" : "",
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </DataSourcePreviewCard>
        ),
      }),
      save: items => {
        const promises = map(items, ds => Group.addDataSource({ id: this.groupId, data_source_id: ds.id }).$promise);
        return Promise.all(promises);
      },
    }).result.finally(() => {
      this.props.controller.update();
    });
  };

  render() {
    const { controller } = this.props;
    return (
      <div data-test="Group">
        <GroupName className="d-block m-t-0 m-b-15" group={this.group} onChange={() => this.forceUpdate()} />
        <Layout>
          <Layout.Sidebar>
            <Sidebar
              controller={controller}
              group={this.group}
              items={this.sidebarMenu}
              canAddDataSources={currentUser.isAdmin}
              onAddDataSourcesClick={this.addDataSources}
              onGroupDeleted={() => navigateTo("/groups", true)}
            />
          </Layout.Sidebar>
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && (
              <div className="text-center">
                <p>There are no data sources in this group yet.</p>
                {currentUser.isAdmin && (
                  <Button type="primary" onClick={this.addDataSources}>
                    <i className="fa fa-plus m-r-5" />
                    Add Data Sources
                  </Button>
                )}
              </div>
            )}
            {controller.isLoaded && !controller.isEmpty && (
              <div className="table-responsive">
                <ItemsTable
                  items={controller.pageItems}
                  columns={this.listColumns}
                  showHeader={false}
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
            )}
          </Layout.Content>
        </Layout>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageGroupDataSources",
    react2angular(
      wrapSettingsTab(
        null,
        liveItemsList(
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
              return item => new DataSource(item);
            },
          }),
          new StateStorage({ orderByField: "name" })
        )
      )
    )
  );

  return routesToAngularRoutes(
    [
      {
        path: "/groups/:groupId/data_sources",
        title: "Group Data Sources",
        key: "datasources",
      },
    ],
    {
      reloadOnSearch: false,
      template: '<page-group-data-sources on-error="handleError"></page-group-data-sources>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
