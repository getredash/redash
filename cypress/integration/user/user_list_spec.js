describe('User List', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/users');
  });

  it('renders the page and takes a screenshot', () => {
    cy.getByTestId('TimeAgo').then(($timeAgo) => {
      $timeAgo.text('an hour ago');
    });

    cy.percySnapshot('Users');
  });
});
