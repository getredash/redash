const SESSION_ITEM = 'session';

function getLocalSessionData() {
  const sessionData = window.sessionStorage.getItem(SESSION_ITEM);
  if (sessionData) {
    return JSON.parse(sessionData);
  }
  return null;
}

function AuthService($window, $location, $q, $http) {
  const Auth = {
    isAuthenticated() {
      const sessionData = getLocalSessionData();
      return sessionData !== null;
    },
    login() {
      const next = encodeURI($location.url());
      window.location.href = `/login?next=${next}`;
    },
    logout() {
      window.sessionStorage.removeItem(SESSION_ITEM);
      $window.location.href = '/logout';
    },
    loadSession() {
      const sessionData = getLocalSessionData();
      if (sessionData) {
        return $q.resolve(sessionData);
      }

      return $http.get('/api/session').then((response) => {
        window.sessionStorage.setItem('session', JSON.stringify(response.data));
        return response.data;
      });
    },
    setApiKey(apiKey) {
      this.apiKey = apiKey;
    },
    getApiKey() {
      return this.apiKey;
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

export default function (ngModule) {
  ngModule.factory('Auth', AuthService);
  ngModule.service('currentUser', CurrentUserService);
  ngModule.service('clientConfig', ClientConfigService);
  ngModule.factory('apiKeyHttpInterceptor', apiKeyHttpInterceptor);

  ngModule.config(($httpProvider) => {
    $httpProvider.interceptors.push('apiKeyHttpInterceptor');
  });
}
