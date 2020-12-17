import { isString, map, get, find } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Link from "@/components/Link";
import Paginator from "@/components/Paginator";
import DynamicComponent from "@/components/DynamicComponent";
import { UserPreviewCard } from "@/components/PreviewCard";
import InputWithCopy from "@/components/InputWithCopy";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";
import LoadingState from "@/components/items-list/components/LoadingState";
import EmptyState from "@/components/items-list/components/EmptyState";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";
import { currentUser } from "@/services/auth";
import { policy } from "@/services/policy";
import User from "@/services/user";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import notification from "@/services/notification";
import { absoluteUrl } from "@/services/utils";
import routes from "@/services/routes";
import CreateUserDialog from "./components/CreateUserDialog";
type UsersListActionsProps = {
    user: {
        id?: number;
        is_invitation_pending?: boolean;
        is_disabled?: boolean;
    };
    enableUser: (...args: any[]) => any;
    disableUser: (...args: any[]) => any;
    deleteUser: (...args: any[]) => any;
};
function UsersListActions({ user, enableUser, disableUser, deleteUser }: UsersListActionsProps) {
    if (user.id === (currentUser as any).id) {
        return null;
    }
    if (user.is_invitation_pending) {
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"danger"' is not assignable to type '"text" ... Remove this comment to see the full error message
        return (<Button type="danger" className="w-100" onClick={event => deleteUser(event, user)}>
        Delete
      </Button>);
    }
    return user.is_disabled ? (<Button type="primary" className="w-100" onClick={event => enableUser(event, user)}>
      Enable
    </Button>) : (<Button className="w-100" onClick={event => disableUser(event, user)}>
      Disable
    </Button>);
}
type UsersListProps = {
    controller: ControllerType;
};
class UsersList extends React.Component<UsersListProps> {
    actions: any;
    sidebarMenu = [
        {
            key: "active",
            href: "users",
            title: "Active Users",
        },
        {
            key: "pending",
            href: "users/pending",
            title: "Pending Invitations",
        },
        {
            key: "disabled",
            href: "users/disabled",
            title: "Disabled Users",
            isAvailable: () => policy.canCreateUser(),
        },
    ];
    listColumns = [
        (Columns.custom as any).sortable((text: any, user: any) => <UserPreviewCard user={user} withLink/>, {
            title: "Name",
            field: "name",
            width: null,
        }),
        (Columns.custom as any).sortable((text: any, user: any) => map(user.groups, group => (<Link key={"group" + group.id} className="label label-tag" href={"groups/" + group.id}>
            {group.name}
          </Link>)), {
            title: "Groups",
            field: "groups",
        }),
        (Columns.timeAgo as any).sortable({
            title: "Joined",
            field: "created_at",
            className: "text-nowrap",
            width: "1%",
        }),
        (Columns.timeAgo as any).sortable({
            title: "Last Active At",
            field: "active_at",
            className: "text-nowrap",
            width: "1%",
        }),
        Columns.custom((text: any, user: any) => (<UsersListActions user={user} enableUser={this.enableUser} disableUser={this.disableUser} deleteUser={this.deleteUser}/>), {
            width: "1%",
            isAvailable: () => policy.canCreateUser(),
        }),
    ];
    componentDidMount() {
        if (this.props.controller.params.isNewUserPage) {
            this.showCreateUserDialog();
        }
    }
    createUser = (values: any) => User.create(values)
        .then(user => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.success("Saved.");
        if ((user as any).invite_link) {
            Modal.warning({
                title: "Email not sent!",
                content: (<React.Fragment>
              <p>
                The mail server is not configured, please send the following link to <b>{(user as any).name}</b>:
              </p>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ value: string; readOnly: true; }' is not a... Remove this comment to see the full error message */}
              <InputWithCopy value={absoluteUrl((user as any).invite_link)} readOnly/>
            </React.Fragment>),
            });
        }
    })
        .catch(error => {
        const message = find([get(error, "response.data.message"), get(error, "message"), "Failed saving."], isString);
        return Promise.reject(new Error(message));
    });
    showCreateUserDialog = () => {
        if (policy.isCreateUserEnabled()) {
            const goToUsersList = () => {
                if (this.props.controller.params.isNewUserPage) {
                    navigateTo("users");
                }
            };
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
            CreateUserDialog.showModal()
                .onClose((values: any) => this.createUser(values).then(() => {
                (this.props.controller as any).update();
                goToUsersList();
            }))
                .onDismiss(goToUsersList);
        }
    };
    enableUser = (event: any, user: any) => User.enableUser(user).then(() => (this.props.controller as any).update());
    disableUser = (event: any, user: any) => User.disableUser(user).then(() => (this.props.controller as any).update());
    deleteUser = (event: any, user: any) => User.deleteUser(user).then(() => (this.props.controller as any).update());
    // eslint-disable-next-line class-methods-use-this
    renderPageHeader() {
        if (!policy.canCreateUser()) {
            return null;
        }
        return (<div className="m-b-15">
        <Button type="primary" disabled={!policy.isCreateUserEnabled()} onClick={this.showCreateUserDialog}>
          <i className="fa fa-plus m-r-5"/>
          New User
        </Button>
        <DynamicComponent name="UsersListExtra"/>
      </div>);
    }
    render() {
        const { controller } = this.props;
        return (<React.Fragment>
        {this.renderPageHeader()}
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Layout>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Sidebar className="m-b-0">
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message */}
            <Sidebar.SearchInput value={controller.searchTerm} onChange={controller.updateSearch}/>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '({ key: string; href: string; title: string;... Remove this comment to see the full error message */}
            <Sidebar.Menu items={this.sidebarMenu} selected={controller.params.currentPage}/>
          </Layout.Sidebar>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className=""/>}
            {controller.isLoaded && controller.isEmpty && <EmptyState className=""/>}
            {controller.isLoaded && !controller.isEmpty && (<div className="table-responsive" data-test="UserList">
                {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
                <ItemsTable items={controller.pageItems} columns={this.listColumns} context={this.actions} orderByField={controller.orderByField} orderByReverse={controller.orderByReverse} toggleSorting={controller.toggleSorting}/>
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message */}
                <Paginator showPageSizeSelect totalCount={controller.totalItemsCount} pageSize={controller.itemsPerPage} onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })} page={controller.page} onChange={(page: any) => controller.updatePagination({ page })}/>
              </div>)}
          </Layout.Content>
        </Layout>
      </React.Fragment>);
    }
}
const UsersListPage = wrapSettingsTab("Users.List", {
    permission: "list_users",
    title: "Users",
    path: "users",
    isActive: (path: any) => path.startsWith("/users") && path !== "/users/me",
    order: 2,
}, itemsList(UsersList, () => new ResourceItemsSource({
    getRequest(request: any, { params: { currentPage } }: any) {
        switch (currentPage) {
            case "active":
                request.pending = false;
                break;
            case "pending":
                request.pending = true;
                break;
            case "disabled":
                request.disabled = true;
                break;
            // no default
        }
        return request;
    },
    getResource() {
        return User.query.bind(User);
    },
}), () => new UrlStateStorage({ orderByField: "created_at", orderByReverse: true })));
routes.register("Users.New", routeWithUserSession({
    path: "/users/new",
    title: "Users",
    render: pageProps => <UsersListPage {...pageProps} currentPage="active" isNewUserPage/>,
}));
routes.register("Users.List", routeWithUserSession({
    path: "/users",
    title: "Users",
    render: pageProps => <UsersListPage {...pageProps} currentPage="active"/>,
}));
routes.register("Users.Pending", routeWithUserSession({
    path: "/users/pending",
    title: "Pending Invitations",
    render: pageProps => <UsersListPage {...pageProps} currentPage="pending"/>,
}));
routes.register("Users.Disabled", routeWithUserSession({
    path: "/users/disabled",
    title: "Disabled Users",
    render: pageProps => <UsersListPage {...pageProps} currentPage="disabled"/>,
}));
