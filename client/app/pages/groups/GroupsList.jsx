import React from "react";
import { react2angular } from "react2angular";

import Button from "antd/lib/button";
import Paginator from "@/components/Paginator";

import { wrap as liveItemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import EmptyState from "@/components/items-list/components/EmptyState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import CreateGroupDialog from "@/components/groups/CreateGroupDialog";
import DeleteGroupButton from "@/components/groups/DeleteGroupButton";
import wrapSettingsTab from "@/components/SettingsWrapper";

import { Group } from "@/services/group";
import { currentUser } from "@/services/auth";
import navigateTo from "@/services/navigateTo";
import { routesToAngularRoutes } from "@/lib/utils";

class GroupsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom(
      (text, group) => (
        <div>
          <a href={"groups/" + group.id}>{group.name}</a>
          {group.type === "builtin" && <span className="label label-default m-l-10">built-in</span>}
        </div>
      ),
      {
        field: "name",
        width: null,
      }
    ),
    Columns.custom(
      (text, group) => (
        <Button.Group>
          <Button href={`groups/${group.id}`}>Members</Button>
          {currentUser.isAdmin && <Button href={`groups/${group.id}/data_sources`}>Data Sources</Button>}
        </Button.Group>
      ),
      {
        width: "1%",
        className: "text-nowrap",
      }
    ),
    Columns.custom(
      (text, group) => {
        const canRemove = group.type !== "builtin";
        return (
          <DeleteGroupButton
            className="w-100"
            disabled={!canRemove}
            group={group}
            title={canRemove ? null : "Cannot delete built-in group"}
            onClick={() => this.onGroupDeleted()}>
            Delete
          </DeleteGroupButton>
        );
      },
      {
        width: "1%",
        className: "text-nowrap p-l-0",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
  ];

  createGroup = () => {
    CreateGroupDialog.showModal().result.then(group => {
      group.$save().then(newGroup => navigateTo(`/groups/${newGroup.id}`));
    });
  };

  onGroupDeleted = () => {
    this.props.controller.updatePagination({ page: 1 });
    this.props.controller.update();
  };

  render() {
    const { controller } = this.props;

    return (
      <div data-test="GroupList">
        {currentUser.isAdmin && (
          <div className="m-b-15">
            <Button type="primary" onClick={this.createGroup}>
              <i className="fa fa-plus m-r-5" />
              New Group
            </Button>
          </div>
        )}

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && <EmptyState className="" />}
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
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageGroupsList",
    react2angular(
      wrapSettingsTab(
        {
          permission: "list_users",
          title: "Groups",
          path: "groups",
          order: 3,
        },
        liveItemsList(
          GroupsList,
          new ResourceItemsSource({
            isPlainList: true,
            getRequest() {
              return {};
            },
            getResource() {
              return Group.query.bind(Group);
            },
            getItemProcessor() {
              return item => new Group(item);
            },
          }),
          new StateStorage({ orderByField: "name", itemsPerPage: 10 })
        )
      )
    )
  );

  return routesToAngularRoutes(
    [
      {
        path: "/groups",
        title: "Groups",
        key: "groups",
      },
    ],
    {
      reloadOnSearch: false,
      template: '<page-groups-list on-error="handleError"></page-groups-list>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
