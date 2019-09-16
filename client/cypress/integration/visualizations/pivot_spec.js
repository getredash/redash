/* global cy, Cypress */

import { createQuery, createVisualization, createDashboard, addWidget } from '../../support/redash-api';

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
  SELECT 'c' AS stage1, 'c4' AS stage2, 44 AS value
`;

describe('Pivot', () => {
  beforeEach(() => {
    cy.login();
    createQuery({ name: 'Pivot Visualization', query: SQL })
      .its('id')
      .as('queryId');
  });

  it('creates Pivot with controls', function () {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId('ExecuteButton').click();

    const visualizationName = 'Pivot';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.getByTestId('VisualizationType.PIVOT').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);
    cy.getByTestId('VisualizationPreview').find('table').should('exist');
    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });

  it('creates Pivot without controls', function () {
    cy.visit(`queries/${this.queryId}/source`);
    cy.getByTestId('ExecuteButton').click();

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

  it('takes a snapshot with different configured Pivots', function () {
    const options = {
      aggregatorName: 'Sum',
      controls: { enabled: true },
      cols: ['stage1'],
      rows: ['stage2'],
      vals: ['value'],
    };

    const pivotWithControls = { ...options, controls: { enabled: false } };
    const pivotWithoutRowTotals = { ...options, rendererOptions: { table: { rowTotals: false } } };
    const pivotWithoutColTotals = { ...options, rendererOptions: { table: { colTotals: false } } };

    createVisualization(this.queryId, 'PIVOT', 'Pivot', options)
      .then((visualization) => { this.pivotId = visualization.id; })
      .then(() => createVisualization(this.queryId, 'PIVOT', 'Pivot with Controls', pivotWithControls))
      .then((visualization) => { this.pivotWithControlsId = visualization.id; })
      .then(() => createVisualization(this.queryId, 'PIVOT', 'Pivot without Row Totals', pivotWithoutRowTotals))
      .then((visualization) => { this.pivotWithoutRowTotals = visualization.id; })
      .then(() => createVisualization(this.queryId, 'PIVOT', 'Pivot without Col Totals', pivotWithoutColTotals))
      .then((visualization) => { this.pivotWithoutColTotals = visualization.id; })
      .then(() => createDashboard('Pivot Visualization'))
      .then(({ slug, id }) => {
        addWidget(id, this.pivotId, { position: { autoHeight: false, sizeY: 10, sizeX: 2 } });
        addWidget(id, this.pivotWithoutRowTotals, { position: { autoHeight: false, col: 2, sizeY: 10, sizeX: 2 } });
        addWidget(id, this.pivotWithoutColTotals, { position: { autoHeight: false, col: 4, sizeY: 10, sizeX: 2 } });
        addWidget(id, this.pivotWithControlsId, { position: { autoHeight: false, row: 9, sizeY: 13 } });
        cy.visit(`/dashboard/${slug}`);
        cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
        cy.percySnapshot('Visualizations - Pivot Table');
      });
  });
});
