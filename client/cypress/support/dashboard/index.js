/* global cy */

import { createQuery, addWidget } from '../redash-api';

const { get } = Cypress._;
const RESIZE_HANDLE_SELECTOR = '.react-resizable-handle';

export function getWidgetTestId(widget) {
  return `WidgetId${widget.id}`;
}

export function createQueryAndAddWidget(dashboardId, queryData = {}) {
  return createQuery(queryData)
    .then((query) => {
      const visualizationId = get(query, 'visualizations.0.id');
      assert.isDefined(visualizationId, 'Query api call returns at least one visualization with id');
      return addWidget(dashboardId, visualizationId);
    })
    .then(getWidgetTestId);
}

export function editDashboard() {
  cy.getByTestId('DashboardMoreMenu')
    .click()
    .within(() => {
      cy.get('li')
        .contains('Edit')
        .click();
    });
}

export function shareDashboard() {
  cy.clickThrough({ button: 'Publish' },
    `OpenShareForm
    PublicAccessEnabled`);

  return cy.getByTestId('SecretAddress').invoke('val');
}

export function dragBy(wrapper, offsetLeft, offsetTop, force = false) {
  if (!offsetLeft) {
    offsetLeft = 1;
  }
  if (!offsetTop) {
    offsetTop = 1;
  }
  return wrapper
    .trigger('mouseover', { force })
    .trigger('mousedown', 'topLeft', { force })
    .trigger('mousemove', 1, 1, { force }) // must have at least 2 mousemove events for react-grid-layout to trigger onLayoutChange
    .trigger('mousemove', offsetLeft, offsetTop, { force })
    .trigger('mouseup', { force });
}

export function resizeBy(wrapper, offsetLeft = 0, offsetTop = 0) {
  return wrapper
    .within(() => {
      dragBy(cy.get(RESIZE_HANDLE_SELECTOR), offsetLeft, offsetTop, true);
    });
}
