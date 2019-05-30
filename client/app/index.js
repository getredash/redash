import ngModule from '@/config';

ngModule.config(($locationProvider, $compileProvider, uiSelectConfig) => {
  $compileProvider.debugInfoEnabled(false);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|data|tel|sms|mailto):/);
  $locationProvider.html5Mode(true);
  uiSelectConfig.theme = 'bootstrap';
});

// Update ui-select's template to use Font-Awesome instead of glyphicon.
ngModule.run(($templateCache) => {
  const templateName = 'bootstrap/match.tpl.html';
  let template = $templateCache.get(templateName);
  template = template.replace('glyphicon glyphicon-remove', 'fa fa-remove');
  $templateCache.put(templateName, template);
});

export default ngModule;
