import { isString } from 'lodash';
import { $location, $rootScope } from '@/services/ng';

export default function navigateTo(url, replace = false) {
  if (isString(url)) {
    $location.url(url);
    if (replace) {
      $location.replace();
    }
    $rootScope.$applyAsync();
  }
}
