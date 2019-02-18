import { isString } from 'lodash';
import { $location, $rootScope } from '@/services/ng';

export default function navigateTo(url) {
  if (isString(url)) {
    $location.url(url);
    $rootScope.$applyAsync();
  }
}
