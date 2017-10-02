import moment from 'moment';
import template from './system-settings.html';

class SystemSettingsCtrl {
  constructor($scope, Organization, toastr) {
    this.timezones = moment.tz.names();

    Organization.query(([organization]) => {
      this.organization = organization;
    });

    $scope.saveOrganization = ({ timezone }) => {
      const data = {
        id: this.organization.id,
        settings: {
          timezone: timezone.$modelValue,
        },
      };

      Organization.save(data, (organization) => {
        toastr.success('Saved.');
        this.organization = organization;
      }, (error) => {
        const message = error.data.message || 'Failed saving.';
        toastr.error(message);
      });
    };
  }
}

export default function (ngModule) {
  ngModule.component('systemSettingsPage', {
    template,
    controller: SystemSettingsCtrl,
  });

  return {
    '/system_settings': {
      template: '<system-settings-page></system-settings-page>',
      title: 'System Settings',
    },
  };
}
