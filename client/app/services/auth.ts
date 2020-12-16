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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{ _isAdmin: ... Remove this comment to see the full error message
    return this.isAdmin || (userId && userId === this.id);
  },

  // @ts-expect-error ts-migrate(7023) FIXME: 'canCreate' implicitly has return type 'any' becau... Remove this comment to see the full error message
  canCreate() {
    return (
      this.hasPermission("create_query") || this.hasPermission("create_dashboard") || this.hasPermission("list_alerts")
    );
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
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type '{ loaded: ... Remove this comment to see the full error message
  extend(currentUser, session.user);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'client_config' does not exist on type '{... Remove this comment to see the full error message
  extend(clientConfig, session.client_config);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'messages' does not exist on type '{ load... Remove this comment to see the full error message
  extend(messages, session.messages);
}

export const Auth = {
  isAuthenticated() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type '{ loaded: ... Remove this comment to see the full error message
    return session.loaded && session.user.id;
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'user' does not exist on type '{ loaded: ... Remove this comment to see the full error message
    if (session.loaded && session.user.id) {
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
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'client_config' does not exist on type 'A... Remove this comment to see the full error message
      updateSession({ client_config: data.client_config, user: { permissions: [] }, messages: [] });
      return data;
    });
  },
  setApiKey(apiKey: any) {
    logger("Set API key to: %s", apiKey);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'apiKey' does not exist on type '{ isAuth... Remove this comment to see the full error message
    Auth.apiKey = apiKey;
  },
  // @ts-expect-error ts-migrate(7023) FIXME: 'getApiKey' implicitly has return type 'any' becau... Remove this comment to see the full error message
  getApiKey() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'apiKey' does not exist on type '{ isAuth... Remove this comment to see the full error message
    return Auth.apiKey;
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
