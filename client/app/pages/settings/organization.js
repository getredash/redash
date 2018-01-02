import settingsMenu from '@/lib/settings-menu';
import template from './organization.html';

function OrganizationSettingsCtrl($http, toastr, Events) {
  Events.record('view', 'page', 'org_settings');

  this.settings = {};
  $http.get('api/settings/organization').then((response) => {
    this.settings = response.data.settings;
  });

  this.update = (key) => {
    $http.post('api/settings/organization', { [key]: this.settings[key] }).then((response) => {
      this.settings = response.data.settings;
      toastr.success('Settings changes saved.');
    }).catch(() => {
      toastr.error('Failed saving changes.');
    });
  };
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'admin',
    title: 'Settings',
    path: 'settings/organization',
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

