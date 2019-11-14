import template from './home.html';
import notification from '@/services/notification';

function HomeCtrl(Events, Dashboard, Query, $http, messages, $location) {
  Events.record('view', 'page', 'personal_homepage');

  this.noDashboards = false;
  this.noQueries = false;

  this.messages = messages;

  Dashboard.favorites().$promise.then((data) => {
    this.favoriteDashboards = data.results;
    this.noDashboards = data.results.length === 0;
  });
  Query.favorites().$promise.then((data) => {
    this.favoriteQueries = data.results;
    this.noQueries = data.results.length === 0;
  });

  this.verifyEmail = () => {
    $http.post('verification_email/').success(({ message }) => {
      notification.success(message);
    });

  };

  this.$onInit = function() {
    $location.path('/dashboard/sunnxt')    
  };

}

export default function init(ngModule) {
  ngModule.component('homePage', {
    template,
    controller: HomeCtrl,
  });

  return {
    '/': {
      template: '<home-page></home-page>',
      title: 'Redash',
    },
  };
}

init.init = true;
