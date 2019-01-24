const pages = [
  { name: 'Create Data Source - Types', url: '/data_sources/new' },
  { name: 'Edit Data Source - PostgreSQL', url: '/data_sources/1' },
  { name: 'Users', url: '/users' },
  { name: 'Groups', url: '/groups' },
  { name: 'Group', url: '/groups/1' },
  { name: 'Create Destination - Types', url: '/destinations/new'},
  { name: 'Organization Settings', url: '/settings/organization' },
  { name: 'User Profile', url: '/users/me' },
];

describe('Percy Page Screenshots', () => {
  pages.forEach((page) => {
    it(`takes a screenshot of ${page.name}`, () => {
      cy.login();
      cy.visit(page.url);
      cy.wait(1000);
      cy.percySnapshot(page.name);
    });
  });
});
