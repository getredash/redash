describe('Embedded Queries', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');
  });

  it('can be shared with safe parameters', () => {
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type("SELECT name, slug FROM organizations WHERE id='{{}{{}id}}'{esc}", { force: true });

    cy.getByTestId('TextParamInput').type('1');
    cy.clickThrough(`
      ParameterSettings-id
      ParameterTypeSelect
      NumberParameterTypeOption
      SaveParameterSettings
      ExecuteButton
      SaveButton
    `);

    cy.location('search').should('eq', '?p_id=1');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe')
      .invoke('text')
      .then((embedUrl) => {
        cy.logout();
        cy.visit(embedUrl);
        cy.getByTestId('VisualizationEmbed', { timeout: 10000 }).should('exist');
        cy.getByTestId('TimeAgo', { timeout: 10000 }).should('exist');
        cy.percySnapshot('Successfully Embedded Parameterized Query');
      });
  });

  it('cannot be shared with unsafe parameters', () => {
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type("SELECT name, slug FROM organizations WHERE name='{{}{{}name}}'{esc}", { force: true });

    cy.getByTestId('TextParamInput').type('Redash');
    cy.clickThrough(`
      ParameterSettings-name
      ParameterTypeSelect
      TextParameterTypeOption
      SaveParameterSettings
      ExecuteButton
      SaveButton
    `);

    cy.location('search').should('eq', '?p_name=Redash');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe')
      .should('not.exist');
    cy.getByTestId('EmbedErrorAlert')
      .should('exist');
  });
});
