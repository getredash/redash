import React from "react";

import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import Paginator from "@/components/Paginator";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import EmptyState from "@/components/items-list/components/EmptyState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import CreateGroupDialog from "@/components/groups/CreateGroupDialog";
import DeleteGroupButton from "@/components/groups/DeleteGroupButton";
import wrapSettingsTab from "@/components/SettingsWrapper";

import Group from "@/services/group";
import { currentUser } from "@/services/auth";

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
    CreateGroupDialog.showModal()
      .result.then(group => {
        Group.create(group).then(newGroup => navigateTo(`groups/${newGroup.id}`));
      })
      .catch(() => {}); // ignore dismiss
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

const GroupsListPage = wrapSettingsTab(
  {
    permission: "list_users",
    title: "Groups",
    path: "groups",
    order: 3,
  },
  itemsList(
    GroupsList,
    () =>
      new ResourceItemsSource({
        isPlainList: true,
        getRequest() {
          return {};
        },
        getResource() {
          return Group.query.bind(Group);
        },
      }),
    () => new StateStorage({ orderByField: "name", itemsPerPage: 10 })
  )
);

export default routeWithUserSession({
  path: "/groups",
  title: "Groups",
  render: pageProps => <GroupsListPage {...pageProps} currentPage="groups" />,
});
