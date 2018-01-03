import settingsMenu from '@/lib/settings-menu';
import startsWith from 'underscore.string/startsWith';
import template from './settings-screen.html';

export default function init(ngModule) {
  ngModule.component('settingsScreen', {
    transclude: true,
    template,
    controller($location, currentUser) {
      this.settingsMenu = settingsMenu;
      this.isActive = prefix => startsWith($location.path(), prefix);
      this.isAvailable = permission => currentUser.hasPermission(permission);
    },
  });
}
