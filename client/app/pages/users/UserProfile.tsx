import React, { useState, useEffect } from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EmailSettingsWarning from "@/components/EmailSettingsWarning";
import DynamicComponent from "@/components/DynamicComponent";
import LoadingState from "@/components/items-list/components/LoadingState";
import wrapSettingsTab from "@/components/SettingsWrapper";
import User from "@/services/user";
import { currentUser } from "@/services/auth";
import routes from "@/services/routes";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import EditableUserProfile from "./components/EditableUserProfile";
import ReadOnlyUserProfile from "./components/ReadOnlyUserProfile";
import "./settings.less";
type OwnProps = {
    userId?: string;
    onError?: (...args: any[]) => any;
};
type Props = OwnProps & typeof UserProfile.defaultProps;
function UserProfile({ userId, onError }: Props) {
    const [user, setUser] = useState(null);
    const handleError = useImmutableCallback(onError);
    useEffect(() => {
        let isCancelled = false;
        User.get({ id: userId || (currentUser as any).id })
            .then(user => {
            if (!isCancelled) {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ id: any; name: any; email: any... Remove this comment to see the full error message
                setUser(User.convertUserInfo(user));
            }
        })
            .catch(error => {
            if (!isCancelled) {
                handleError(error);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [userId, handleError]);
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const canEdit = user && (currentUser.isAdmin || (currentUser as any).id === user.id);
    return (<React.Fragment>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
      <EmailSettingsWarning featureName="invite emails" className="m-b-20" adminOnly/>
      <div className="row">
        {!user && <LoadingState className=""/>}
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        {user && (<DynamicComponent name="UserProfile" user={user}>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'UserProfile... Remove this comment to see the full error message */}
            {!canEdit && <ReadOnlyUserProfile user={user}/>}
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'UserProfile... Remove this comment to see the full error message */}
            {canEdit && <EditableUserProfile user={user}/>}
          </DynamicComponent>)}
      </div>
    </React.Fragment>);
}
UserProfile.defaultProps = {
    userId: null,
    onError: () => { },
};
const UserProfilePage = wrapSettingsTab("Users.Account", {
    title: "Account",
    path: "users/me",
    order: 7,
}, UserProfile);
routes.register("Users.Account", routeWithUserSession({
    path: "/users/me",
    title: "Account",
    render: pageProps => <UserProfilePage {...pageProps}/>,
}));
routes.register("Users.ViewOrEdit", routeWithUserSession({
    path: "/users/:userId",
    title: "Users",
    render: pageProps => <UserProfilePage {...pageProps}/>,
}));
