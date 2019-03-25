function addQueryByAPI(data, shouldPublish = true) {
  const merged = Object.assign({
    name: 'Test Query',
    query: `
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
    `,
    data_source_id: 1,
    options: {
      parameters: [],
    },
    schedule: null,
  }, data);

  const request = cy.request('POST', '/api/queries', merged);
  if (shouldPublish) {
    request.then(({ body }) => cy.request('POST', `/api/queries/${body.id}`, { is_draft: false }));
  }

  return request.then(({ body }) => body);
}

describe('Sankey and Sunburst', () => {
  beforeEach(() => {
    cy.login();
    addQueryByAPI().then(({ id }) => {
      cy.visit(`queries/${id}/source`);
      cy.getByTestId('ExecuteButton').click();
    });
  });

  it('creates Sunburst', () => {
    const visualizationName = 'Sunburst';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.contains('li', 'Sunburst').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);
    cy.getByTestId('VisualizationPreview').find('svg').should('exist');
    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });

  it('creates Sankey', () => {
    const visualizationName = 'Sankey';

    cy.getByTestId('NewVisualization').click();
    cy.getByTestId('VisualizationType').click();
    cy.contains('li', 'Sankey').click();
    cy.getByTestId('VisualizationName').clear().type(visualizationName);
    cy.getByTestId('VisualizationPreview').find('svg').should('exist');
    cy.getByTestId('EditVisualizationDialog').contains('button', 'Save').click();
    cy.getByTestId('QueryPageVisualizationTabs').contains('li', visualizationName).should('exist');
  });
});
