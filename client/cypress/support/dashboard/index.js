/* global cy */

import { createQuery, addWidget } from "../redash-api";

const { get } = Cypress._;
const RESIZE_HANDLE_SELECTOR = ".react-resizable-handle";

export function getWidgetTestId(widget) {
  return `WidgetId${widget.id}`;
}

export function createQueryAndAddWidget(dashboardId, queryData = {}, widgetOptions = {}) {
  return createQuery(queryData)
    .then(query => {
      const visualizationId = get(query, "visualizations.0.id");
      assert.isDefined(visualizationId, "Query api call returns at least one visualization with id");
      return addWidget(dashboardId, visualizationId, widgetOptions);
    })
    .then(getWidgetTestId);
}

export function editDashboard() {
  cy.getByTestId("DashboardMoreButton").click();

  cy.getByTestId("DashboardMoreButtonMenu")
    .contains("Edit")
    .click();
}

export function shareDashboard() {
  cy.clickThrough(
    { button: "Publish" },
    `OpenShareForm
    PublicAccessEnabled`
  );

  return cy.getByTestId("SecretAddress").invoke("val");
}

export function resizeBy(wrapper, offsetLeft = 0, offsetTop = 0) {
  return wrapper.within(() => {
    cy.get(RESIZE_HANDLE_SELECTOR).dragBy(offsetLeft, offsetTop, true);
  });
}
