import "./commands";

Cypress.on("uncaught:exception", err => {
  // Prevent ResizeObserver error from failing tests
  if (err && Cypress._.includes(err.message, "ResizeObserver loop limit exceeded")) {
    return false;
  }
});
