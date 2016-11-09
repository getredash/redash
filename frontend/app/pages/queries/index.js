import registerSourceView from './source-view';
import registerView from './view';
import registerQueryResultsLink from './query-results-link';
import registerQueryEditor from './query-editor';
import registerSchemaBrowser from './schema-browser';

export default function (ngModule) {
  registerQueryResultsLink(ngModule);
  registerQueryEditor(ngModule);
  registerSchemaBrowser(ngModule);
  return Object.assign({}, registerSourceView(ngModule), registerView(ngModule));
}
