// these are non angu
featureFlags = [];
currentUser = {
  id: 1,
  name: 'John Mock',
  email: 'john@example.com',
  groups: ['default'],
  permissions: [],
  canEdit: function(object) {
    var user_id = object.user_id || (object.user && object.user.id);
    return user_id && (user_id == currentUser.id);
  },
  hasPermission: function(permission) {
    return this.permissions.indexOf(permission) != -1;
  }
};


angular.module('redashMocks', [])
  .value('mockData', {
    query: {

      "ttl": -1,
      "query": "select name from users;",
      "id": 1803,
      "description": "",
      "name": "my test query",
      "created_at": "2014-01-07T16:11:31.859528+02:00",
      "query_hash": "c89c235bc73e462e9702debc56adc309",

      "user": {
        "email": "amirn@everything.me",
        "id": 48,
        "name": "Amir Nissim"
      },

      "visualizations": [{
        "description": "",
        "options": {},
        "type": "TABLE",
        "id": 636,
        "name": "Table"
      }],

      "api_key": "123456789",

      "data_source_id": 1,

      "latest_query_data_id": 106632,

      "latest_query_data": {
        "retrieved_at": "2014-07-29T10:49:10.951364+03:00",
        "query_hash": "c89c235bc73e462e9702debc56adc309",
        "query": "select name from users;",
        "runtime": 0.0139260292053223,
        "data": {
          "rows": [{
            "name": "Amir Nissim"
          }, {
            "name": "Arik Fraimovich"
          }],
          "columns": [{
            "friendly_name": "name",
            "type": null,
            "name": "name"
          }, {
            "friendly_name": "mail::filter",
            "type": null,
            "name": "mail::filter"
          }]
        },
        "id": 106632,
        "data_source_id": 1
      }

    }
  });
