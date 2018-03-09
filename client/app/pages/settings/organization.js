import settingsMenu from '@/lib/settings-menu';
import template from './organization.html';

function OrganizationSettingsCtrl($http, toastr, clientConfig, Events) {
  Events.record('view', 'page', 'org_settings');

  this.settings = {};
  $http.get('api/settings/organization').then((response) => {
    this.settings = response.data.settings;
  });

  this.update = (key) => {
    $http.post('api/settings/organization', { [key]: this.settings[key] }).then((response) => {
      this.settings = response.data.settings;
      toastr.success('Settings changes saved.');

      if (this.disablePasswordLoginToggle() && this.settings.auth_password_login_enabled === false) {
        this.settings.auth_password_login_enabled = true;
        this.update('auth_password_login_enabled');
      }
    }).catch(() => {
      toastr.error('Failed saving changes.');
    });
  };

  this.googleLoginEnabled = clientConfig.googleLoginEnabled;

  this.disablePasswordLoginToggle = () =>
    (clientConfig.googleLoginEnabled || this.settings.auth_saml_enabled) === false;
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: 'Settings',
    path: 'settings/organization',
    order: 6,
  });

  ngModule.component('organizationSettingsPage', {
    template,
    controller: OrganizationSettingsCtrl,
  });

  return {
    '/settings/organization': {
      template: '<organization-settings-page></organization-settings-page>',
      title: 'Organization Settings',
    },
  };
}

