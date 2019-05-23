import { isString } from 'lodash';
import { $location, $rootScope, $route } from '@/services/ng';

export default function navigateTo(url, replace = false, reload = true) {
  if (isString(url)) {
    if (!reload) {
      const lastRoute = $route.current;
      const un = $rootScope.$on('$locationChangeSuccess', () => {
        $route.current = lastRoute;
        un();
      });
    }
    $location.url(url);
    if (replace) {
      $location.replace();
    }
    $rootScope.$applyAsync();
  }
}
