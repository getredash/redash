import settingsMenu from '@/lib/settings-menu';
import { Paginator } from '@/lib/pagination';
import template from './list.html';

function SnippetsCtrl($location, currentUser, Events, QuerySnippet) {
  Events.record('view', 'page', 'query_snippets');

  this.snippets = new Paginator([], { itemsPerPage: 20 });
  QuerySnippet.query((snippets) => {
    this.snippets.updateRows(snippets);
  });
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'create_query',
    title: 'Query Snippets',
    path: 'query_snippets',
    order: 5,
  });

  ngModule.component('snippetsListPage', {
    template,
    controller: SnippetsCtrl,
  });

  return {
    '/query_snippets': {
      template: '<snippets-list-page></snippets-list-page>',
      title: 'Query Snippets',
    },
  };
}
