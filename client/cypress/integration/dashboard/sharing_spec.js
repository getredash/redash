/* global cy */

import { createDashboard, createQuery } from '../../support/redash-api';
import { editDashboard } from '../../support/dashboard';

describe('Dashboard Sharing', () => {
  beforeEach(function () {
    cy.login();
    createDashboard('Foo Bar').then(({ slug, id }) => {
      this.dashboardId = id;
      this.dashboardUrl = `/dashboard/${slug}`;
    });
  });

  it('is possible if all queries are safe', function () {
    const options = {
      parameters: [{
        name: 'foo',
        type: 'number',
      }],
    };

    const dashboardUrl = this.dashboardUrl;
    createQuery({ options }).then(({ id: queryId }) => {
      cy.visit(dashboardUrl);
      editDashboard();
      cy.contains('a', 'Add Widget').click();
      cy.getByTestId('AddWidgetDialog').within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      });
      cy.contains('button', 'Add to Dashboard').click();
      cy.getByTestId('AddWidgetDialog').should('not.exist');
      cy.clickThrough({ button: `
        Done Editing
        Publish
      ` },
      `OpenShareForm
      PublicAccessEnabled`);

      cy.getByTestId('SecretAddress').should('exist');
    });
  });

  describe('is available to unauthenticated users', () => {
    const addWidgetAndShareDashboard = (dashboardUrl, query, options, callback) => {
      createQuery({ query, options }).then(({ id: queryId }) => {
        cy.visit(dashboardUrl);
        editDashboard();
        cy.contains('a', 'Add Widget').click();
        cy.getByTestId('AddWidgetDialog').within(() => {
          cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
        });
        cy.contains('button', 'Add to Dashboard').click();
        cy.getByTestId('AddWidgetDialog').should('not.exist');
        cy.clickThrough({ button: `
          Done Editing
          Publish
        ` },
        `OpenShareForm
        PublicAccessEnabled`);

        cy.getByTestId('SecretAddress').invoke('val').then((secretAddress) => {
          callback(secretAddress);
        });
      });
    };

    it('when there are no parameters', function () {
      addWidgetAndShareDashboard(this.dashboardUrl, 'select 1', {}, (secretAddress) => {
        cy.logout();
        cy.visit(secretAddress);
        cy.getByTestId('DynamicTable', { timeout: 10000 }).should('exist');
        cy.percySnapshot('Successfully Shared Unparameterized Dashboard');
      });
    });

    it('when there are only safe parameters', function () {
      addWidgetAndShareDashboard(this.dashboardUrl, "select '{{foo}}'", {
        parameters: [{
          name: 'foo',
          type: 'number',
          value: 1,
        }],
      }, (secretAddress) => {
        cy.logout();
        cy.visit(secretAddress);
        cy.getByTestId('DynamicTable', { timeout: 10000 }).should('exist');
        cy.percySnapshot('Successfully Shared Parameterized Dashboard');
      });
    });

    it('even when there are suddenly some unsafe parameters', function () {
      // start out by creating a dashboard with no parameters & share it
      const dashboardUrl = this.dashboardUrl;
      addWidgetAndShareDashboard(dashboardUrl, 'select 1', {}, (secretAddress) => {
        // then, after it is shared, add an unsafe parameterized query to it
        createQuery({
          query: "select '{{foo}}'",
          options: {
            parameters: [{
              name: 'foo',
              type: 'text',
              value: 'oh snap!',
            }],
          },
        }).then(({ id: queryId }) => {
          cy.visit(dashboardUrl);
          editDashboard();
          cy.contains('a', 'Add Widget').click();
          cy.getByTestId('AddWidgetDialog').within(() => {
            cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
          });
          cy.contains('button', 'Add to Dashboard').click();
          cy.getByTestId('AddWidgetDialog').should('not.exist');
          cy.contains('button', 'Done Editing').click();
          cy.logout();
          cy.visit(secretAddress);
          cy.getByTestId('DynamicTable', { timeout: 10000 }).should('exist');
          cy.percySnapshot('Successfully Shared Parameterized Dashboard With Some Unsafe Queries');
        });
      });
    });
  });

  it('is not possible if some queries are not safe', function () {
    const options = {
      parameters: [{
        name: 'foo',
        type: 'text',
      }],
    };

    const dashboardUrl = this.dashboardUrl;
    createQuery({ options }).then(({ id: queryId }) => {
      cy.visit(dashboardUrl);
      editDashboard();
      cy.contains('a', 'Add Widget').click();
      cy.getByTestId('AddWidgetDialog').within(() => {
        cy.get(`.query-selector-result[data-test="QueryId${queryId}"]`).click();
      });
      cy.contains('button', 'Add to Dashboard').click();
      cy.getByTestId('AddWidgetDialog').should('not.exist');
      cy.clickThrough({ button: `
        Done Editing
        Publish
      ` },
      'OpenShareForm');

      cy.getByTestId('PublicAccessEnabled').should('be.disabled');
    });
  });
});
