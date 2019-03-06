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

export function handleNavigationEvent(event, url, replace = false) {
  event.preventDefault();
  event.stopPropagation();
  if (event.ctrlKey || event.metaKey) {
    window.open(url, '_blank');
  } else {
    navigateTo(url, replace);
  }
}
