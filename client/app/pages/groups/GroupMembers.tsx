import { includes, map } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import Paginator from "@/components/Paginator";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
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
import Group from "@/services/group";
import User from "@/services/user";
import routes from "@/services/routes";
type Props = {
    controller: ControllerType;
};
class GroupMembers extends React.Component<Props> {
    actions: any;
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
        Columns.custom((text: any, user: any) => <UserPreviewCard user={user} withLink/>, {
            title: "Name",
            field: "name",
            width: null,
        }),
        Columns.custom((text: any, user: any) => {
            if (!this.group) {
                return null;
            }
            // cannot remove self from built-in groups
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            if (this.group.type === "builtin" && (currentUser as any).id === user.id) {
                return null;
            }
            // @ts-expect-error ts-migrate(2322) FIXME: Type '"danger"' is not assignable to type '"link" ... Remove this comment to see the full error message
            return (<Button className="w-100" type="danger" onClick={event => this.removeGroupMember(event, user)}>
            Remove
          </Button>);
        }, {
            width: "1%",
            isAvailable: () => currentUser.isAdmin,
        }),
    ];
    componentDidMount() {
        Group.get({ id: this.groupId })
            .then(group => {
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'AxiosResponse<any>' is not assignable to typ... Remove this comment to see the full error message
            this.group = group;
            this.forceUpdate();
        })
            .catch(error => {
            this.props.controller.handleError(error);
        });
    }
    removeGroupMember = (event: any, user: any) => Group.removeMember({ id: this.groupId, userId: user.id })
        .then(() => {
        this.props.controller.updatePagination({ page: 1 });
        (this.props.controller as any).update();
    })
        .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Failed to remove member from group.");
    });
    addMembers = () => {
        const alreadyAddedUsers = map((this.props.controller as any).allItems, u => u.id);
        SelectItemsDialog.showModal({
            dialogTitle: "Add Members",
            inputPlaceholder: "Search users...",
            selectedItemsTitle: "New Members",
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'results' does not exist on type 'AxiosRe... Remove this comment to see the full error message
            searchItems: (searchTerm: any) => User.query({ q: searchTerm }).then(({ results }) => results),
            renderItem: (item: any, { isSelected }: any) => {
                const alreadyInGroup = includes(alreadyAddedUsers, item.id);
                return {
                    content: (<UserPreviewCard user={item}>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup}/>
            </UserPreviewCard>),
                    isDisabled: alreadyInGroup,
                    className: isSelected || alreadyInGroup ? "selected" : "",
                };
            },
            renderStagedItem: (item: any, { isSelected }: any) => ({
                content: (<UserPreviewCard user={item}>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
            <ListItemAddon isSelected={isSelected} isStaged/>
          </UserPreviewCard>),
            }),
        }).onClose((items: any) => {
            const promises = map(items, u => Group.addMember({ id: this.groupId }, { user_id: u.id }));
            return Promise.all(promises).then(() => (this.props.controller as any).update());
        });
    };
    render() {
        const { controller } = this.props;
        return (<div data-test="Group">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
        <GroupName className="d-block m-t-0 m-b-15" group={this.group} onChange={() => this.forceUpdate()}/>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Layout>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Layout.Sidebar>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'ControllerType' is not assignable to type 'n... Remove this comment to see the full error message */}
            <Sidebar controller={controller} group={this.group} items={this.sidebarMenu} canAddMembers={currentUser.isAdmin} onAddMembersClick={this.addMembers} onGroupDeleted={() => navigateTo("groups")}/>
          </Layout.Sidebar>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className=""/>}
            {controller.isLoaded && controller.isEmpty && (<div className="text-center">
                <p>There are no members in this group yet.</p>
                {currentUser.isAdmin && (<Button type="primary" onClick={this.addMembers}>
                    <i className="fa fa-plus m-r-5"/>
                    Add Members
                  </Button>)}
              </div>)}
            {controller.isLoaded && !controller.isEmpty && (<div className="table-responsive">
                {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
                <ItemsTable items={controller.pageItems} columns={this.listColumns} showHeader={false} context={this.actions} orderByField={controller.orderByField} orderByReverse={controller.orderByReverse} toggleSorting={controller.toggleSorting}/>
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message */}
                <Paginator showPageSizeSelect totalCount={controller.totalItemsCount} pageSize={controller.itemsPerPage} onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })} page={controller.page} onChange={(page: any) => controller.updatePagination({ page })}/>
              </div>)}
          </Layout.Content>
        </Layout>
      </div>);
    }
}
const GroupMembersPage = wrapSettingsTab("Groups.Members", null, itemsList(GroupMembers, () => new ResourceItemsSource({
    isPlainList: true,
    getRequest(unused: any, { params: { groupId } }: any) {
        return { id: groupId };
    },
    getResource() {
        return Group.members.bind(Group);
    },
}), () => new StateStorage({ orderByField: "name" })));
routes.register("Groups.Members", routeWithUserSession({
    path: "/groups/:groupId",
    title: "Group Members",
    render: pageProps => <GroupMembersPage {...pageProps} currentPage="users"/>,
}));
