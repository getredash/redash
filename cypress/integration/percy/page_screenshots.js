const pages = [
  {
    name: 'Create Data Source - Types',
    url: '/data_sources/new',
    resources: ['/api/data_sources/types'],
  },
  {
    name: 'Edit Data Source - PostgreSQL',
    url: '/data_sources/1',
    resources: ['/api/data_sources/1', '/api/data_sources/types'],
  },
  {
    name: 'Users',
    url: '/users',
    resources: ['/api/users**'],
  },
  {
    name: 'Groups',
    url: '/groups',
    resources: ['/api/groups'],
  },
  {
    name: 'Group',
    url: '/groups/1',
    resources: ['/api/groups/1'],
  },
  {
    name: 'Create Destination - Types',
    url: '/destinations/new',
    resources: ['/api/destinations/types'],
  },
  {
    name: 'Organization Settings',
    url: '/settings/organization',
    resources: ['/api/settings/organization'],
  },
];

describe('Percy Page Screenshots', () => {
  pages.forEach((page) => {
    it(`takes a screenshot of ${page.name}`, () => {
      cy.server();
      page.resources.forEach((resource) => {
        cy.route(resource).as(resource);
      });

      cy.login();
      cy.visit(page.url);

      page.resources.forEach((resource) => {
        cy.wait(`@${resource}`);
      });
      cy.percySnapshot(page.name);
    });
  });
});
