describe('Embedded Queries', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/queries/new');
  });

  it('are shared with safe parameters', () => {
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type('SELECT name, slug FROM organizations WHERE id=\'{{}{{}id}}\'{esc}', { force: true });

    cy.getByTestId('TextParamInput').type('1{enter}');
    cy.clickThrough(`
      ParameterSettings-id
      ParameterTypeSelect
      NumberParameterTypeOption
      SaveParameterSettings
      SaveButton
    `);

    cy.location('search').should('eq', '?p_id=1');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe').invoke('text').then((iframe) => {
      const embedUrl = iframe.match(/"(.*?)"/)[1];
      cy.logout();
      cy.visit(embedUrl);
      cy.getByTestId('VisualizationEmbed', { timeout: 10000 }).should('exist');
      cy.percySnapshot('Successfully Embedded Parameterized Query');
    });
  });

  it('cannot be shared with unsafe parameters', () => {
    cy.getByTestId('QueryEditor')
      .get('.ace_text-input')
      .type('SELECT name, slug FROM organizations WHERE name=\'{{}{{}name}}\'{esc}', { force: true });

    cy.getByTestId('TextParamInput').type('Redash{enter}');
    cy.clickThrough(`
      ParameterSettings-name
      ParameterTypeSelect
      TextParameterTypeOption
      SaveParameterSettings
      SaveButton
    `);


    cy.location('search').should('eq', '?p_name=Redash');
    cy.clickThrough(`
      QueryControlDropdownButton
      ShowEmbedDialogButton
    `);

    cy.getByTestId('EmbedIframe').invoke('text').then((iframe) => {
      const embedUrl = iframe.match(/"(.*?)"/)[1];
      cy.logout();
      cy.visit(embedUrl, { failOnStatusCode: false }); // prevent 403 from failing test
      cy.getByTestId('ErrorMessage', { timeout: 10000 }).should('exist');
      cy.percySnapshot('Unsuccessfully Embedded Parameterized Query');
    });
  });
});
