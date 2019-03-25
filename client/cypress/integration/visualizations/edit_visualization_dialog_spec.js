function addQueryByAPI(data, shouldPublish = true) {
  const merged = Object.assign({
    name: 'Test Query',
    query: 'select 1',
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

describe('Edit visualization dialog', () => {
  beforeEach(() => {
    cy.login();
    addQueryByAPI().then(({ id }) => {
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
