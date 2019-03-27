/* global cy */

import { createQuery } from '../../support/redash-api';

describe('Edit visualization dialog', () => {
  beforeEach(() => {
    cy.login();
    createQuery().then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId('ExecuteButton').click();
    });
  });

  it('opens New Visualization dialog', () => {
    cy.getByTestId('NewVisualization').should('exist').click();
    cy.getByTestId('EditVisualizationDialog').should('exist');
    // Default visualization should be selected
    cy.getByTestId('VisualizationType').should('exist').should('contain', 'Chart');
    cy.getByTestId('VisualizationName').should('exist').should('have.value', 'Chart');
  });

  it('opens Edit Visualization dialog', () => {
    cy.getByTestId('EditVisualization').click();
    cy.getByTestId('EditVisualizationDialog').should('exist');
    // Default visualization should be selected
    cy.getByTestId('VisualizationType').should('exist').should('contain', 'Table');
    cy.getByTestId('VisualizationName').should('exist').should('have.value', 'Table');
  });
});
