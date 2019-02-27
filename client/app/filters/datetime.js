import moment from 'moment';
import { clientConfig } from '@/services/auth';

export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return '-';
  }

  return parsed.format(clientConfig.dateTimeFormat);
}

export default function init(ngModule) {
  ngModule.filter('toMilliseconds', () => value => value * 1000.0);
  ngModule.filter('dateTime', () => formatDateTime);
}

init.init = true;
