import { includes, map } from "lodash";
import React from "react";
import { react2angular } from "react2angular";
import Button from "antd/lib/button";

import Paginator from "@/components/Paginator";

import { wrap as liveItemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import SelectItemsDialog from "@/components/SelectItemsDialog";
import { UserPreviewCard } from "@/components/PreviewCard";

import GroupName from "@/components/groups/GroupName";
import ListItemAddon from "@/components/groups/ListItemAddon";
import Sidebar from "@/components/groups/DetailsPageSidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";

import notification from "@/services/notification";
import { currentUser } from "@/services/auth";
import { Group } from "@/services/group";
import { User } from "@/services/user";
import navigateTo from "@/services/navigateTo";
import { routesToAngularRoutes } from "@/lib/utils";

class GroupMembers extends React.Component {
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
    Columns.custom((text, user) => <UserPreviewCard user={user} withLink />, {
      title: "Name",
      field: "name",
      width: null,
    }),
    Columns.custom(
      (text, user) => {
        if (!this.group) {
          return null;
        }

        // cannot remove self from built-in groups
        if (this.group.type === "builtin" && currentUser.id === user.id) {
          return null;
        }
        return (
          <Button className="w-100" type="danger" onClick={event => this.removeGroupMember(event, user)}>
            Remove
          </Button>
        );
      },
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

  removeGroupMember = (event, user) =>
    Group.removeMember({ id: this.groupId, userId: user.id })
      .$promise.then(() => {
        this.props.controller.updatePagination({ page: 1 });
        this.props.controller.update();
      })
      .catch(() => {
        notification.error("Failed to remove member from group.");
      });

  addMembers = () => {
    const alreadyAddedUsers = map(this.props.controller.allItems, u => u.id);
    SelectItemsDialog.showModal({
      dialogTitle: "Add Members",
      inputPlaceholder: "Search users...",
      selectedItemsTitle: "New Members",
      searchItems: searchTerm => User.query({ q: searchTerm }).$promise.then(({ results }) => results),
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = includes(alreadyAddedUsers, item.id);
        return {
          content: (
            <UserPreviewCard user={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </UserPreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? "selected" : "",
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <UserPreviewCard user={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </UserPreviewCard>
        ),
      }),
      save: items => {
        const promises = map(items, u => Group.addMember({ id: this.groupId }, { user_id: u.id }).$promise);
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
              canAddMembers={currentUser.isAdmin}
              onAddMembersClick={this.addMembers}
              onGroupDeleted={() => navigateTo("/groups", true)}
            />
          </Layout.Sidebar>
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && (
              <div className="text-center">
                <p>There are no members in this group yet.</p>
                {currentUser.isAdmin && (
                  <Button type="primary" onClick={this.addMembers}>
                    <i className="fa fa-plus m-r-5" />
                    Add Members
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
    "pageGroupMembers",
    react2angular(
      wrapSettingsTab(
        null,
        liveItemsList(
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
              return item => new User(item);
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
        path: "/groups/:groupId",
        title: "Group Members",
        key: "users",
      },
    ],
    {
      reloadOnSearch: false,
      template: '<page-group-members on-error="handleError"></page-group-members>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
