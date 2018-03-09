import { sortBy } from 'underscore';

const settingsMenu = {
  menus: [],
  add(menu) {
    if (menu.pathPrefix === undefined) {
      menu.pathPrefix = `/${menu.path}`;
    }

    this.menus.push(menu);
    this.menus = sortBy(this.menus, 'order');
  },
};

export default settingsMenu;
