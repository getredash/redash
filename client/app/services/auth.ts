import debug from "debug";
import { includes, extend } from "lodash";
import location from "@/services/location";
import { axios } from "@/services/axios";
import { notifySessionRestored } from "@/services/restoreSession";
export const currentUser = {
    _isAdmin: undefined,
    // @ts-expect-error ts-migrate(7023) FIXME: 'canEdit' implicitly has return type 'any' because... Remove this comment to see the full error message
    canEdit(object: any) {
        const userId = object.user_id || (object.user && object.user.id);
        return this.isAdmin || (userId && userId === (this as any).id);
    },
    // @ts-expect-error ts-migrate(7023) FIXME: 'canCreate' implicitly has return type 'any' becau... Remove this comment to see the full error message
    canCreate() {
        return (this.hasPermission("create_query") || this.hasPermission("create_dashboard") || this.hasPermission("list_alerts"));
    },
    // @ts-expect-error ts-migrate(7023) FIXME: 'hasPermission' implicitly has return type 'any' b... Remove this comment to see the full error message
    hasPermission(permission: any) {
        if (permission === "admin" && this._isAdmin !== undefined) {
            return this._isAdmin;
        }
        // @ts-expect-error ts-migrate(2551) FIXME: Property 'permissions' does not exist on type '{ _... Remove this comment to see the full error message
        return includes(this.permissions, permission);
    },
    // @ts-expect-error ts-migrate(7023) FIXME: 'isAdmin' implicitly has return type 'any' because... Remove this comment to see the full error message
    get isAdmin() {
        return this.hasPermission("admin");
    },
    set isAdmin(isAdmin) {
        this._isAdmin = isAdmin;
    },
};
export const clientConfig = {};
export const messages = [];
const logger = debug("redash:auth");
const session = { loaded: false };
const AuthUrls = {
    Login: "login",
};
export function updateClientConfig(newClientConfig: any) {
    extend(clientConfig, newClientConfig);
}
function updateSession(sessionData: any) {
    logger("Updating session to be:", sessionData);
    extend(session, sessionData, { loaded: true });
    extend(currentUser, (session as any).user);
    extend(clientConfig, (session as any).client_config);
    extend(messages, (session as any).messages);
}
export const Auth = {
    isAuthenticated() {
        return session.loaded && (session as any).user.id;
    },
    getLoginUrl() {
        return AuthUrls.Login;
    },
    setLoginUrl(loginUrl: any) {
        AuthUrls.Login = loginUrl;
    },
    login() {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'undefined' is not assignable to ... Remove this comment to see the full error message
        const next = encodeURI(location.url);
        logger("Calling login with next = %s", next);
        window.location.href = `${AuthUrls.Login}?next=${next}`;
    },
    logout() {
        logger("Logout.");
        window.location.href = "logout";
    },
    loadSession() {
        logger("Loading session");
        if (session.loaded && (session as any).user.id) {
            logger("Resolving with local value.");
            return Promise.resolve(session);
        }
        Auth.setApiKey(null);
        return axios.get("api/session").then(data => {
            updateSession(data);
            return session;
        });
    },
    loadConfig() {
        logger("Loading config");
        return axios.get("/api/config").then(data => {
            updateSession({ client_config: (data as any).client_config, user: { permissions: [] }, messages: [] });
            return data;
        });
    },
    setApiKey(apiKey: any) {
        logger("Set API key to: %s", apiKey);
        (Auth as any).apiKey = apiKey;
    },
    getApiKey() {
        return (Auth as any).apiKey;
    },
    requireSession() {
        logger("Requested authentication");
        if (Auth.isAuthenticated()) {
            return Promise.resolve(session);
        }
        return Auth.loadSession()
            .then(() => {
            if (Auth.isAuthenticated()) {
                logger("Loaded session");
                notifySessionRestored();
                return session;
            }
            logger("Need to login, redirecting");
            Auth.login();
        })
            .catch(() => {
            logger("Need to login, redirecting");
            Auth.login();
        });
    },
};
