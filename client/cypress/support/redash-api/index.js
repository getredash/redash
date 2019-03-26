/* global cy */

import { extend, get } from 'lodash';

export function createDashboard(name) {
  return cy.request('POST', 'api/dashboards', { name })
    .then(({ body }) => body);
}

export function createQuery(data, shouldPublish = true) {
  const merged = extend({
    name: 'Test Query',
    query: 'select 1',
    data_source_id: 1,
    options: {
      parameters: [],
    },
    schedule: null,
  }, data);

  let request = cy.request('POST', '/api/queries', merged);
  if (shouldPublish) {
    request = request.then(({ body }) => (
      cy.request('POST', `/api/queries/${body.id}`, { is_draft: false })
        .then(() => body)
    ));
  }

  return request;
}

export function addTextbox(dashboardId, text = 'text') {
  const data = {
    width: 1,
    dashboard_id: dashboardId,
    visualization_id: null,
    text,
    options: {
      position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
    },
  };

  return cy.request('POST', 'api/widgets', data)
    .then(({ body }) => {
      const id = get(body, 'id');
      assert.isDefined(id, 'Widget api call returns widget id');
      return body;
    });
}

export function addWidget(dashboardId, visualizationId) {
  const data = {
    width: 1,
    dashboard_id: dashboardId,
    visualization_id: visualizationId,
    options: {
      position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
    },
  };

  return cy.request('POST', 'api/widgets', data)
    .then(({ body }) => {
      const id = get(body, 'id');
      assert.isDefined(id, 'Widget api call returns widget id');
      return body;
    });
}
