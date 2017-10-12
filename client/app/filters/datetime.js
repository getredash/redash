import moment from 'moment';

export default function init(ngModule) {
  ngModule.filter('toMilliseconds', () => value => value * 1000.0);

  ngModule.filter('dateTime', clientConfig =>
    function dateTime(value) {
      if (!value) {
        return '-';
      }

      return moment(value).format(clientConfig.dateTimeFormat);
    });
}
