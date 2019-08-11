/* global cy, Cypress */

import { createQuery } from '../../support/redash-api';

const { get } = Cypress._;

const SQL = `
  SELECT 'a' AS stage1, 'a1' AS stage2, 11 AS value UNION ALL
  SELECT 'a' AS stage1, 'a2' AS stage2, 12 AS value UNION ALL
  SELECT 'a' AS stage1, 'a3' AS stage2, 45 AS value UNION ALL
  SELECT 'a' AS stage1, 'a4' AS stage2, 54 AS value UNION ALL
  SELECT 'b' AS stage1, 'b1' AS stage2, 33 AS value UNION ALL
  SELECT 'b' AS stage1, 'b2' AS stage2, 73 AS value UNION ALL
  SELECT 'b' AS stage1, 'b3' AS stage2, 90 AS value UNION ALL
  SELECT 'c' AS stage1, 'c1' AS stage2, 19 AS value UNION ALL
  SELECT 'c' AS stage1, 'c2' AS stage2, 92 AS value UNION ALL
  SELECT 'c' AS stage1, 'c3' AS stage2, 63 AS value UNION ALL
  SELECT 'c' AS stage1, 'c4' AS stage2, 44 AS v
`;

describe('Pivot', () => {
  beforeEach(() => {
    cy.login();
    createQuery({ query: SQL }).then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId('ExecuteButton').click();
    });
  });

  it('creates Pivot with controls', () => {
    const visualizationName = 'Pivot';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.PIVOT').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);
    cy.getByTestId('VisualizationPreview').find('table').should('exist');
    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });

  it('creates Pivot without controls', () => {
    const visualizationName = 'Pivot';

    cy.server();
    cy.route('POST', 'api/visualizations').as('SaveVisualization');

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.PIVOT').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);

    cy.getByTestId('PivotEditor.HideControls').click();
    cy.getByTestId('VisualizationPreview')
      .find('table')
      .find('.pvtAxisContainer, .pvtRenderer, .pvtVals')
      .should('be.not.visible');

    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.wait('@SaveVisualization').then((xhr) => {
      const visualizationId = get(xhr, 'response.body.id');
      // Added visualization should also have hidden controls
      cy.getByTestId(`QueryPageVisualization${visualizationId}`)
        .find('table')
        .find('.pvtAxisContainer, .pvtRenderer, .pvtVals')
        .should('be.not.visible');
    });
  });
});
