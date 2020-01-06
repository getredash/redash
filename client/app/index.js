import ngModule from "@/config";

ngModule.config(($locationProvider, $compileProvider) => {
  $compileProvider.debugInfoEnabled(false);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|data|tel|sms|mailto):/);
  $locationProvider.html5Mode(true);
});

export default ngModule;
