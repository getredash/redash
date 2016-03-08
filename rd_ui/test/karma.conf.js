// Karma configuration
// http://karma-runner.github.io/0.12/config/configuration-file.html
// Generated on 2014-07-30 using
// generator-karma 0.8.3

module.exports = function(config) {
  'use strict';

  config.set({
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // base path, that will be used to resolve files and exclude
    basePath: '../',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'app/bower_components/jquery/jquery.js',
      'app/bower_components/jquery-ui/ui/jquery-ui.js',

      'app/bower_components/angular/angular.js',
      'app/bower_components/angular-route/angular-route.js',
      'app/bower_components/angular-mocks/angular-mocks.js',

      'app/bower_components/bootstrap/js/collapse.js',
      'app/bower_components/bootstrap/js/modal.js',
      'app/bower_components/angular-resource/angular-resource.js',
      'app/bower_components/underscore/underscore.js',
      'app/bower_components/moment/moment.js',
      'app/bower_components/angular-moment/angular-moment.js',
      'app/bower_components/codemirror/lib/codemirror.js',
      'app/bower_components/codemirror/addon/edit/matchbrackets.js',
      'app/bower_components/codemirror/addon/edit/closebrackets.js',
      'app/bower_components/codemirror/mode/sql/sql.js',
      'app/bower_components/codemirror/mode/javascript/javascript.js',
      'app/bower_components/angular-ui-codemirror/ui-codemirror.js',
      'app/bower_components/plotly/plotly.js',
      'app/bower_components/angular-plotly/src/angular-plotly.js', 
      'app/bower_components/gridster/dist/jquery.gridster.js',
      'app/bower_components/angular-growl/build/angular-growl.js',
      'app/bower_components/pivottable/dist/pivot.js',
      'app/bower_components/cornelius/src/cornelius.js',
      'app/bower_components/mousetrap/mousetrap.js',
      'app/bower_components/mousetrap/plugins/global-bind/mousetrap-global-bind.js',
      'app/bower_components/select2/select2.js',
      'app/bower_components/angular-ui-select2/src/select2.js',
      'app/bower_components/angular-ui-select/dist/select.js',
      'app/bower_components/underscore.string/lib/underscore.string.js',
      'app/bower_components/marked/lib/marked.js',
      'app/scripts/ng_smart_table.js',
      'app/scripts/ui-bootstrap-tpls-0.5.0.min.js',
      'app/bower_components/bucky/bucky.js',
      'app/bower_components/pace/pace.js',
      'app/bower_components/mustache/mustache.js',

      'app/scripts/app.js',
      'app/scripts/services/services.js',
      'app/scripts/services/resources.js',
      'app/scripts/services/notifications.js',
      'app/scripts/services/dashboards.js',
      'app/scripts/controllers/controllers.js',
      'app/scripts/controllers/dashboard.js',
      'app/scripts/controllers/admin_controllers.js',
      'app/scripts/controllers/query_view.js',
      'app/scripts/controllers/query_source.js',
      'app/scripts/visualizations/base.js',
      'app/scripts/visualizations/chart.js',
      'app/scripts/visualizations/cohort.js',
      'app/scripts/visualizations/table.js',
      'app/scripts/visualizations/pivot.js',
      'app/scripts/directives/directives.js',
      'app/scripts/directives/query_directives.js',
      'app/scripts/directives/dashboard_directives.js',
      'app/scripts/directives/plotly.js',
      'app/scripts/filters.js',

      'app/views/**/*.html',

      'test/mocks/*.js',
      'test/unit/*.js'
    ],

    // generate js files from html templates
    preprocessors: {
      'app/views/**/*.html': 'ng-html2js'
    },

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 8080,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      'PhantomJS'
    ],

    // Which plugins to enable
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-ng-html2js-preprocessor'
    ],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlRoot: '_karma_'
  });
};
