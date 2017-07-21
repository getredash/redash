import registerSourceView from './source-view';
import registerView from './view';
import registerQueryResultsLink from './query-results-link';
import registerQueryEditor from './query-editor';
import registerSchemaBrowser from './schema-browser';
import registerEmbedCodeDialog from './embed-code-dialog';
import registerApiKeyDialog from './api-key-dialog';
import registerScheduleDialog from './schedule-dialog';
import registerAlertUnsavedChanges from './alert-unsaved-changes';
import registerQuerySearchResultsPage from './queries-search-results-page';
import registerVisualizationEmbed from './visualization-embed';
import registerCompareQueryDialog from './compare-query-dialog';
import registerGetDataSourceVersion from './get-data-source-version';

export default function (ngModule) {
  registerQueryResultsLink(ngModule);
  registerQueryEditor(ngModule);
  registerSchemaBrowser(ngModule);
  registerEmbedCodeDialog(ngModule);
  registerScheduleDialog(ngModule);
  registerAlertUnsavedChanges(ngModule);
  registerVisualizationEmbed(ngModule);
  registerCompareQueryDialog(ngModule);
  registerApiKeyDialog(ngModule);
  registerGetDataSourceVersion(ngModule);

  return Object.assign({}, registerQuerySearchResultsPage(ngModule),
                           registerSourceView(ngModule),
                           registerView(ngModule));
}
