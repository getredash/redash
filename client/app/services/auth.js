import debug from "debug";
import { includes, extend } from "lodash";
import { axios } from "@/services/axios";

// eslint-disable-next-line import/no-mutable-exports
export let Auth = null;

export const currentUser = {
  canEdit(object) {
    const userId = object.user_id || (object.user && object.user.id);
    return this.hasPermission("admin") || (userId && userId === this.id);
  },

  canCreate() {
    return (
      this.hasPermission("create_query") || this.hasPermission("create_dashboard") || this.hasPermission("list_alerts")
    );
  },

  hasPermission(permission) {
    return includes(this.permissions, permission);
  },

  get isAdmin() {
    return this.hasPermission("admin");
  },
};

export const clientConfig = {};
export const messages = [];

const logger = debug("redash:auth");
const session = { loaded: false };

function updateSession(sessionData) {
  logger("Updating session to be:", sessionData);
  extend(session, sessionData, { loaded: true });
  extend(currentUser, session.user);
  extend(clientConfig, session.client_config);
  extend(messages, session.messages);
}

function AuthService($window, $location, $q) {
  return {
    isAuthenticated() {
      return session.loaded && session.user.id;
    },
    login() {
      const next = encodeURI($location.url());
      logger("Calling login with next = %s", next);
      window.location.href = `login?next=${next}`;
    },
    logout() {
      logger("Logout.");
      $window.location.href = "logout";
    },
    loadSession() {
      logger("Loading session");
      if (session.loaded && session.user.id) {
        logger("Resolving with local value.");
        return $q.resolve(session);
      }

      this.setApiKey(null);
      return axios.get("api/session").then(data => {
        updateSession(data);
        return session;
      });
    },
    loadConfig() {
      logger("Loading config");
      return axios.get("/api/config").then(data => {
        updateSession({ client_config: data.client_config, user: { permissions: [] }, messages: [] });
        return data;
      });
    },
    setApiKey(apiKey) {
      logger("Set API key to: %s", apiKey);
      this.apiKey = apiKey;
    },
    getApiKey() {
      return this.apiKey;
    },
    requireSession() {
      logger("Requested authentication");
      if (this.isAuthenticated()) {
        return $q.when(session);
      }
      return this.loadSession()
        .then(() => {
          if (this.isAuthenticated()) {
            logger("Loaded session");
            return session;
          }
          logger("Need to login, redirecting");
          this.login();
        })
        .catch(() => {
          logger("Need to login, redirecting");
          this.login();
        });
    },
  };
}

export default function init(ngModule) {
  ngModule.factory("Auth", AuthService);
  ngModule.value("currentUser", currentUser);
  ngModule.value("clientConfig", clientConfig);
  ngModule.value("messages", messages);

  ngModule.run($injector => {
    Auth = $injector.get("Auth");
  });
}

init.init = true;
