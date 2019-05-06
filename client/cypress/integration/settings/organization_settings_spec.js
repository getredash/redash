describe('Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/settings/organization');
  });

  it('renders the page and takes a screenshot', () => {
    cy.getByTestId('OrganizationSettings').within(() => {
      cy.getByTestId('DateFormatSelect').should('have.value', 'DD/MM/YY');
      cy.getByTestId('TimeFormatSelect').should('have.value', 'HH:mm');
    });

    cy.percySnapshot('Organization Settings');
  });
});
