/* global cy, Cypress */

const { extend, get, merge } = Cypress._;

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

  // eslint-disable-next-line cypress/no-assigning-return-values
  let request = cy.request('POST', '/api/queries', merged).then(({ body }) => body);
  if (shouldPublish) {
    request = request.then(query => (
      cy.request('POST', `/api/queries/${query.id}`, { is_draft: false })
        .then(() => query)
    ));
  }

  return request;
}

export function createVisualization(queryId, type, name, options) {
  const data = { query_id: queryId, type, name, options };
  return cy.request('POST', '/api/visualizations', data).then(({ body }) => ({
    query_id: queryId,
    ...body,
  }));
}

export function addTextbox(dashboardId, text = 'text', options = {}) {
  const defaultOptions = {
    position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
  };

  const data = {
    width: 1,
    dashboard_id: dashboardId,
    visualization_id: null,
    text,
    options: merge(defaultOptions, options),
  };

  return cy.request('POST', 'api/widgets', data)
    .then(({ body }) => {
      const id = get(body, 'id');
      assert.isDefined(id, 'Widget api call returns widget id');
      return body;
    });
}

export function addWidget(dashboardId, visualizationId, options = {}) {
  const defaultOptions = {
    position: { col: 0, row: 0, sizeX: 3, sizeY: 3 },
  };

  const data = {
    width: 1,
    dashboard_id: dashboardId,
    visualization_id: visualizationId,
    options: merge(defaultOptions, options),
  };

  return cy.request('POST', 'api/widgets', data)
    .then(({ body }) => {
      const id = get(body, 'id');
      assert.isDefined(id, 'Widget api call returns widget id');
      return body;
    });
}
