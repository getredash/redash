function AlertSubscription($resource) {
  const resource = $resource('api/alerts/:alertId/subscriptions/:subscriberId', { alertId: '@alert_id', subscriberId: '@id' });
  return resource;
}

export default function (ngModule) {
  ngModule.factory('AlertSubscription', AlertSubscription);
}
