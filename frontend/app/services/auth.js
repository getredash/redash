function getLocalSessionData() {
  const sessionData = window.sessionStorage.getItem('session');
  if (sessionData) {
    return JSON.parse(sessionData);
  }
  return null;
}

function AuthService($window, $location, $q, $http) {
  const Auth = {
    isAuthenticated() {
      return getLocalSessionData() !== null;
    },
    login() {
      // const next = encodeURI($location.url());
      console.log('do the login manually!');
      // $window.location.href = `http://localhost:5000/default/login?next=${next}`;
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
  };

  return Auth;
}

function CurrentUserService() {
  Object.assign(this, getLocalSessionData().user);

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

export default function (ngModule) {
  ngModule.factory('Auth', AuthService);
  ngModule.service('currentUser', CurrentUserService);
  ngModule.service('clientConfig', ClientConfigService);
}
