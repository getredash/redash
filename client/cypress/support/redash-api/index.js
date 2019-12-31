/* global cy, Cypress */

const { extend, get, merge, find } = Cypress._;

export function createDashboard(name) {
  return cy.request("POST", "api/dashboards", { name }).then(({ body }) => body);
}

export function createQuery(data, shouldPublish = true) {
  const merged = extend(
    {
      name: "Test Query",
      query: "select 1",
      data_source_id: 1,
      options: {
        parameters: [],
      },
      schedule: null,
    },
    data
  );

  // eslint-disable-next-line cypress/no-assigning-return-values
  let request = cy.request("POST", "/api/queries", merged).then(({ body }) => body);
  if (shouldPublish) {
    request = request.then(query =>
      cy.request("POST", `/api/queries/${query.id}`, { is_draft: false }).then(() => query)
    );
  }

  return request;
}

export function createVisualization(queryId, type, name, options) {
  const data = { query_id: queryId, type, name, options };
  return cy.request("POST", "/api/visualizations", data).then(({ body }) => ({
    query_id: queryId,
    ...body,
  }));
}

export function addTextbox(dashboardId, text = "text", options = {}) {
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

  return cy.request("POST", "api/widgets", data).then(({ body }) => {
    const id = get(body, "id");
    assert.isDefined(id, "Widget api call returns widget id");
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

  return cy.request("POST", "api/widgets", data).then(({ body }) => {
    const id = get(body, "id");
    assert.isDefined(id, "Widget api call returns widget id");
    return body;
  });
}

export function createAlert(queryId, options = {}, name) {
  const defaultOptions = {
    column: "?column?",
    op: "greater than",
    rearm: 0,
    value: 1,
  };

  const data = {
    query_id: queryId,
    name: name || "Alert for query " + queryId,
    options: merge(defaultOptions, options),
  };

  return cy.request("POST", "api/alerts", data).then(({ body }) => {
    const id = get(body, "id");
    assert.isDefined(id, "Alert api call returns alert id");
    return body;
  });
}

export function createUser({ name, email, password }) {
  return cy
    .request({
      method: "POST",
      url: "api/users",
      body: { name, email },
      failOnStatusCode: false,
    })
    .then(xhr => {
      const { status, body } = xhr;
      if (status < 200 || status > 400) {
        throw new Error(xhr);
      }

      if (status === 400 && body.message === "Email already taken.") {
        // all is good, do nothing
        return;
      }

      const id = get(body, "id");
      assert.isDefined(id, "User api call returns user id");

      return cy.request({
        url: body.invite_link,
        method: "POST",
        form: true,
        body: { password },
      });
    });
}

export function getDestinations() {
  return cy.request("GET", "api/destinations").then(({ body }) => body);
}

export function addDestinationSubscription(alertId, destinationName) {
  return getDestinations()
    .then(destinations => {
      const destination = find(destinations, { name: destinationName });
      if (!destination) {
        throw new Error("Destination not found");
      }
      return cy.request("POST", `api/alerts/${alertId}/subscriptions`, {
        alert_id: alertId,
        destination_id: destination.id,
      });
    })
    .then(({ body }) => {
      const id = get(body, "id");
      assert.isDefined(id, "Subscription api call returns subscription id");
      return body;
    });
}
