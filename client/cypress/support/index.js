/* global Cypress */

import "@cypress/code-coverage/support";
import "./commands";
import "./redash-api/index.js";

Cypress.env("dataSourceId", 1);

Cypress.on("uncaught:exception", err => {
  // Prevent ResizeObserver error from failing tests
  if (err && Cypress._.includes(err.message, "ResizeObserver loop limit exceeded")) {
    return false;
  }
});
