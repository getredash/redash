/* global cy */

const { get } = Cypress._;
const RESIZE_HANDLE_SELECTOR = ".react-resizable-handle";

export function getWidgetTestId(widget) {
  return `WidgetId${widget.id}`;
}

export function createQueryAndAddWidget(dashboardId, queryData = {}, widgetOptions = {}) {
  return cy
    .createQuery(queryData)
    .then((query) => {
      const visualizationId = get(query, "visualizations.0.id");
      assert.isDefined(visualizationId, "Query api call returns at least one visualization with id");
      return cy.addWidget(dashboardId, visualizationId, widgetOptions);
    })
    .then(getWidgetTestId);
}

export function editDashboard() {
  cy.getByTestId("DashboardMoreButton").click();

  cy.getByTestId("DashboardMoreButtonMenu").contains("Edit").click();
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
  return wrapper.find(RESIZE_HANDLE_SELECTOR).first().then(($handle) => {
    const handle = $handle[0];
    const { ownerDocument } = handle;
    const { scrollX, scrollY } = ownerDocument.defaultView;
    const MouseEventCtor = ownerDocument.defaultView.MouseEvent;
    const rect = handle.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const endX = startX + offsetLeft;
    const endY = startY + offsetTop;
    const mouseOptions = (clientX, clientY, buttons) => ({
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons,
      which: 1,
      clientX,
      clientY,
      pageX: clientX + scrollX,
      pageY: clientY + scrollY,
      screenX: clientX,
      screenY: clientY,
      view: ownerDocument.defaultView,
    });

    cy.wrap(handle)
      .scrollIntoView()
      .then(() => {
        handle.dispatchEvent(new MouseEventCtor("mouseover", mouseOptions(startX, startY, 0)));
        handle.dispatchEvent(new MouseEventCtor("mousedown", mouseOptions(startX, startY, 1)));
      });
    
    return cy
      .then(() => Cypress.Promise.delay(16))
      .then(() => {
        ownerDocument.dispatchEvent(new MouseEventCtor("mousemove", mouseOptions(startX + 2, startY + 2, 1)));
      })
      .then(() => Cypress.Promise.delay(16))
      .then(() => {
        ownerDocument.dispatchEvent(
          new MouseEventCtor("mousemove", mouseOptions(startX + (endX - startX) / 2, startY + (endY - startY) / 2, 1))
        );
      })
      .then(() => Cypress.Promise.delay(16))
      .then(() => {
        ownerDocument.dispatchEvent(new MouseEventCtor("mousemove", mouseOptions(endX, endY, 1)));
      })
      .then(() => Cypress.Promise.delay(16))
      .then(() => {
        ownerDocument.dispatchEvent(new MouseEventCtor("mouseup", mouseOptions(endX, endY, 0)));
      });
  });
}
