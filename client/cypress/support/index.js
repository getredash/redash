import "./commands";

Cypress.Cookies.defaults({
    whitelist: "csrf_token"
});