import { createAlert, createQuery, createUser, addDestinationSubscription } from '../../support/redash-api';

describe('View Alert', () => {
  beforeEach(function () {
    cy.login();
    createQuery({ query: 'select 1 as col_name' })
      .then(({ id: queryId }) => createAlert(queryId, { column: 'col_name' }))
      .then(({ id: alertId }) => {
        this.alertId = alertId;
        this.alertUrl = `/alerts/${alertId}`;
      });
  });

  it('renders the page and takes a screenshot', function () {
    cy.visit(this.alertUrl);
    cy.getByTestId('Criteria').should('exist');
    cy.percySnapshot('View Alert screen');
  });

  it('allows adding new destinations', function () {
    cy.visit(this.alertUrl);
    cy.getByTestId('AlertDestinations').contains('Test Email Destination').should('not.exist');

    cy.server();
    cy.route('GET', 'api/destinations').as('Destinations');
    cy.route('GET', 'api/alerts/*/subscriptions').as('Subscriptions');

    cy.visit(this.alertUrl);

    cy.wait(['@Destinations', '@Subscriptions']);
    cy.getByTestId('ShowAddAlertSubDialog').click();
    cy.contains('Test Email Destination').click();
    cy.contains('Save').click();

    cy.getByTestId('AlertDestinations').contains('Test Email Destination').should('exist');
  });

  describe('Alert Destination permissions', () => {
    before(() => {
      cy.login();
      createUser({
        name: 'Example User',
        email: 'user@redash.io',
        password: 'password',
      });
    });

    beforeEach(() => {
      cy.login(); // as admin
    });

    afterEach(() => {
      cy.logout();
    });

    it('hides remove button from non-author', function () {
      addDestinationSubscription(this.alertId, 'Test Email Destination');

      cy.server();
      cy.route('GET', 'api/alerts/*/subscriptions').as('Subscriptions');
      cy.visit(this.alertUrl);

      // verify remove button appears for author
      cy.wait(['@Subscriptions']);
      cy.getByTestId('AlertDestinations')
        .contains('Test Email Destination')
        .parent().within(() => {
          cy.get('.remove-button').should('exist');
        });

      cy.logout();
      cy.login('user@redash.io', 'password');
      cy.reload();

      // verify remove button not shown for non-author
      cy.wait(['@Subscriptions']);
      cy.getByTestId('AlertDestinations')
        .contains('Test Email Destination')
        .parent().within(() => {
          cy.get('.remove-button').should('not.exist');
        });
    });

    it('shows remove button for non-author admin', function () {
      cy.logout();
      cy.login('user@redash.io', 'password');

      addDestinationSubscription(this.alertId, 'Test Email Destination');

      cy.server();
      cy.route('GET', 'api/alerts/*/subscriptions').as('Subscriptions');
      cy.visit(this.alertUrl);

      // verify remove button appears for author
      cy.wait(['@Subscriptions']);
      cy.getByTestId('AlertDestinations')
        .contains('Test Email Destination')
        .parent().within(() => {
          cy.get('.remove-button').should('exist');
        });

      cy.logout();
      cy.login(); // as admin
      cy.reload();

      // verify remove button still appears for admin
      cy.wait(['@Subscriptions']);
      cy.getByTestId('AlertDestinations')
        .contains('Test Email Destination')
        .parent().within(() => {
          cy.get('.remove-button').should('exist');
        });
    });
  });
});
