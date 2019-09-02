import settingsMenu from '@/services/settingsMenu';
import template from './settings-screen.html';

export default function init(ngModule) {
  ngModule.component('settingsScreen', {
    transclude: true,
    template,
    controller($location, currentUser) {
      this.settingsMenu = settingsMenu;
      this.isActive = menuItem => menuItem.isActive($location.path());
      this.isAvailable = permission => permission === undefined || currentUser.hasPermission(permission);
    },
  });
}

init.init = true;
