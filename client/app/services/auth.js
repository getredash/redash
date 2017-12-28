import debug from 'debug';

const logger = debug('redash:auth');
const SESSION_ITEM = 'session';
const session = { loaded: false };

function storeSession(sessionData) {
  logger('Updating session to be:', sessionData);
  Object.assign(session, sessionData, { loaded: true });
}

function getLocalSessionData() {
  if (session.loaded) {
    return session;
  }

  const sessionData = window.sessionStorage.getItem(SESSION_ITEM);
  if (sessionData) {
    storeSession(JSON.parse(sessionData));
  }

  return session;
}

function AuthService($window, $location, $q, $http) {
  const Auth = {
    isAuthenticated() {
      const sessionData = getLocalSessionData();
      return sessionData.loaded && sessionData.user.id;
    },
    login() {
      const next = encodeURI($location.url());
      logger('Calling login with next = %s', next);
      window.location.href = `login?next=${next}`;
    },
    logout() {
      logger('Logout.');
      window.sessionStorage.removeItem(SESSION_ITEM);
      $window.location.href = 'logout';
    },
    loadSession() {
      logger('Loading session');
      const sessionData = getLocalSessionData();
      if (sessionData.loaded && sessionData.user.id) {
        logger('Resolving with local value.');
        return $q.resolve(sessionData);
      }

      this.setApiKey(null);
      return $http.get('api/session').then((response) => {
        storeSession(response.data);
        return session;
      });
    },
    loadConfig() {
      logger('Loading config');
      return $http.get('/api/config').then((response) => {
        storeSession({ client_config: response.data.client_config, user: { permissions: [] } });
        return response.data;
      });
    },
    setApiKey(apiKey) {
      logger('Set API key to: %s', apiKey);
      this.apiKey = apiKey;
    },
    getApiKey() {
      return this.apiKey;
    },
    requireSession() {
      logger('Requested authentication');
      if (Auth.isAuthenticated()) {
        return $q.when(getLocalSessionData());
      }
      return Auth.loadSession().then(() => {
        if (Auth.isAuthenticated()) {
          logger('Loaded session');
          return getLocalSessionData();
        }
        logger('Need to login, redirecting');
        this.login();
      }).catch(() => {
        logger('Need to login, redirecting');
        this.login();
      });
    },
  };

  return Auth;
}

function CurrentUserService() {
  const sessionData = getLocalSessionData();
  Object.assign(this, sessionData.user);

  this.canEdit = (object) => {
    const userId = object.user_id || (object.user && object.user.id);
    return this.hasPermission('admin') || (userId && (userId === this.id));
  };

  this.hasPermission = permission => this.permissions.indexOf(permission) !== -1;

  this.isAdmin = this.hasPermission('admin');
}

function ClientConfigService() {
  Object.assign(this, getLocalSessionData().client_config);
}

function apiKeyHttpInterceptor($injector) {
  return {
    request(config) {
      const Auth = $injector.get('Auth');
      const apiKey = Auth.getApiKey();
      if (apiKey) {
        config.headers.Authorization = `Key ${apiKey}`;
      }

      return config;
    },
  };
}

export default function init(ngModule) {
  ngModule.factory('Auth', AuthService);
  ngModule.service('currentUser', CurrentUserService);
  ngModule.service('clientConfig', ClientConfigService);
  ngModule.factory('apiKeyHttpInterceptor', apiKeyHttpInterceptor);

  ngModule.config(($httpProvider) => {
    $httpProvider.interceptors.push('apiKeyHttpInterceptor');
  });
}
