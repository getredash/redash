import settingsMenu from '@/lib/settings-menu';
import { isFunction } from 'lodash';
import template from './settings-screen.html';

export default function init(ngModule) {
  ngModule.component('settingsScreen', {
    transclude: true,
    template,
    controller($location, currentUser) {
      this.settingsMenu = settingsMenu;
      this.isActive = (menuItem) => {
        if (isFunction(menuItem.isActive)) {
          return menuItem.isActive($location);
        }
        return $location.path().startsWith(menuItem.pathPrefix);
      };
      this.isAvailable = permission => permission === undefined || currentUser.hasPermission(permission);
    },
  });
}

init.init = true;

