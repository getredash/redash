import 'angular-dynamic-locale/dist/tmhDynamicLocale';

import counterTemplate from './counter.html';
import counterEditorTemplate from './counter-editor.html';


function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}


function CounterRenderer(tmhDynamicLocale) {
  return {
    restrict: 'E',
    template: counterTemplate,
    link($scope) {
      const refreshData = () => {
        const queryData = $scope.queryResult.getData();
        if (queryData) {
          tmhDynamicLocale.set($scope.visualization.options.counterLocale);
          $scope.counterLocale = $scope.visualization.options.counterLocale;
          $scope.fractionSize = $scope.visualization.options.fractionSize;
          $scope.suffix = $scope.visualization.options.suffix;
          $scope.format = $scope.visualization.options.format;

          const rowNumber = getRowNumber($scope.visualization.options.rowNumber, queryData.length);
          const targetRowNumber =
            getRowNumber($scope.visualization.options.targetRowNumber, queryData.length);
          const counterColName = $scope.visualization.options.counterColName;
          const targetColName = $scope.visualization.options.targetColName;

          if ($scope.visualization.options.countRow) {
            $scope.counterValue = queryData.length;
          } else if (counterColName) {
            $scope.counterValue = queryData[rowNumber][counterColName];
          }
          if (targetColName) {
            $scope.targetValue = queryData[targetRowNumber][targetColName];

            if ($scope.targetValue) {
              $scope.delta = $scope.counterValue - $scope.targetValue;
              $scope.trendPositive = $scope.delta >= 0;
            }
          } else {
            $scope.targetValue = null;
          }
        }
      };

      $scope.$watch('visualization.options', refreshData, true);
      $scope.$watch('queryResult && queryResult.getData()', refreshData);
    },
  };
}

function CounterEditor() {
  return {
    restrict: 'E',
    template: counterEditorTemplate,
    link(scope) {
      scope.formattingOptions = ['Number', 'Currency'];
      scope.localeOptions = {
        af: { name: 'Afrikaans' },
        sq: { name: 'Albanian' },
        'ar-dz': { name: 'Arabic (Algeria)' },
        'ar-bh': { name: 'Arabic (Bahrain)' },
        'ar-eg': { name: 'Arabic (Egypt)' },
        'ar-iq': { name: 'Arabic (Iraq)' },
        'ar-jo': { name: 'Arabic (Jordan)' },
        'ar-kw': { name: 'Arabic (Kuwait)' },
        'ar-lb': { name: 'Arabic (Lebanon)' },
        'ar-ly': { name: 'Arabic (Libya)' },
        'ar-ma': { name: 'Arabic (Morocco)' },
        'ar-om': { name: 'Arabic (Oman)' },
        'ar-qa': { name: 'Arabic (Qatar)' },
        'ar-sa': { name: 'Arabic (Saudi Arabia)' },
        ar: { name: 'Arabic (Standard)' },
        'ar-sy': { name: 'Arabic (Syria)' },
        'ar-tn': { name: 'Arabic (Tunisia)' },
        'ar-ae': { name: 'Arabic (U.A.E.)' },
        'ar-ye': { name: 'Arabic (Yemen)' },
        hy: { name: 'Armenian' },
        as: { name: 'Assamese' },
        ast: { name: 'Asturian' },
        az: { name: 'Azerbaijani' },
        eu: { name: 'Basque' },
        be: { name: 'Belarusian' },
        bn: { name: 'Bengali' },
        bs: { name: 'Bosnian' },
        br: { name: 'Breton' },
        bg: { name: 'Bulgarian' },
        my: { name: 'Burmese' },
        ca: { name: 'Catalan' },
        ce: { name: 'Chechen' },
        'zh-hk': { name: 'Chinese (Hong Kong)' },
        'zh-cn': { name: 'Chinese (PRC)' },
        'zh-tw': { name: 'Chinese (Taiwan)' },
        zh: { name: 'Chinese' },
        hr: { name: 'Croatian' },
        cs: { name: 'Czech' },
        da: { name: 'Danish' },
        'nl-be': { name: 'Dutch (Belgian)' },
        nl: { name: 'Dutch (Standard)' },
        'en-au': { name: 'English (Australia)' },
        'en-bz': { name: 'English (Belize)' },
        'en-ca': { name: 'English (Canada)' },
        'en-ie': { name: 'English (Ireland)' },
        'en-jm': { name: 'English (Jamaica)' },
        'en-nz': { name: 'English (New Zealand)' },
        'en-ph': { name: 'English (Philippines)' },
        'en-za': { name: 'English (South Africa)' },
        'en-tt': { name: 'English (Trinidad & Tobago)' },
        'en-gb': { name: 'English (United Kingdom)' },
        'en-us': { name: 'English (United States)' },
        'en-zw': { name: 'English (Zimbabwe)' },
        en: { name: 'English' },
        eo: { name: 'Esperanto' },
        et: { name: 'Estonian' },
        fo: { name: 'Faeroese' },
        fa: { name: 'Farsi' },
        fi: { name: 'Finnish' },
        'fr-be': { name: 'French (Belgium)' },
        'fr-ca': { name: 'French (Canada)' },
        'fr-fr': { name: 'French (France)' },
        'fr-lu': { name: 'French (Luxembourg)' },
        'fr-mc': { name: 'French (Monaco)' },
        fr: { name: 'French (Standard)' },
        'fr-ch': { name: 'French (Switzerland)' },
        fy: { name: 'Frisian' },
        fur: { name: 'Friulian' },
        mk: { name: 'FYRO Macedonian' },
        gd: { name: 'Gaelic (Scots)' },
        gl: { name: 'Galacian' },
        ka: { name: 'Georgian' },
        'de-at': { name: 'German (Austria)' },
        'de-de': { name: 'German (Germany)' },
        'de-li': { name: 'German (Liechtenstein)' },
        'de-lu': { name: 'German (Luxembourg)' },
        de: { name: 'German (Standard)' },
        'de-ch': { name: 'German (Switzerland)' },
        el: { name: 'Greek' },
        gu: { name: 'Gujurati' },
        he: { name: 'Hebrew' },
        hi: { name: 'Hindi' },
        hu: { name: 'Hungarian' },
        is: { name: 'Icelandic' },
        id: { name: 'Indonesian' },
        ga: { name: 'Irish' },
        it: { name: 'Italian (Standard)' },
        'it-ch': { name: 'Italian (Switzerland)' },
        ja: { name: 'Japanese' },
        kn: { name: 'Kannada' },
        ks: { name: 'Kashmiri' },
        kk: { name: 'Kazakh' },
        km: { name: 'Khmer' },
        ky: { name: 'Kirghiz' },
        'ko-kp': { name: 'Korean (North Korea)' },
        'ko-kr': { name: 'Korean (South Korea)' },
        ko: { name: 'Korean' },
        lv: { name: 'Latvian' },
        lt: { name: 'Lithuanian' },
        lb: { name: 'Luxembourgish' },
        ms: { name: 'Malay' },
        ml: { name: 'Malayalam' },
        mt: { name: 'Maltese' },
        mr: { name: 'Marathi' },
        mo: { name: 'Moldavian' },
        ne: { name: 'Nepali' },
        nb: { name: 'Norwegian (Bokmal)' },
        nn: { name: 'Norwegian (Nynorsk)' },
        no: { name: 'Norwegian' },
        or: { name: 'Oriya' },
        om: { name: 'Oromo' },
        'fa-ir': { name: 'Persian/Iran' },
        pl: { name: 'Polish' },
        'pt-br': { name: 'Portuguese (Brazil)' },
        pt: { name: 'Portuguese' },
        pa: { name: 'Punjabi' },
        qu: { name: 'Quechua' },
        rm: { name: 'Rhaeto-Romanic' },
        ro: { name: 'Romanian' },
        ru: { name: 'Russian' },
        sg: { name: 'Sango' },
        sr: { name: 'Serbian' },
        si: { name: 'Singhalese' },
        sk: { name: 'Slovak' },
        sl: { name: 'Slovenian' },
        so: { name: 'Somani' },
        'es-ar': { name: 'Spanish (Argentina)' },
        'es-bo': { name: 'Spanish (Bolivia)' },
        'es-cl': { name: 'Spanish (Chile)' },
        'es-co': { name: 'Spanish (Colombia)' },
        'es-cr': { name: 'Spanish (Costa Rica)' },
        'es-do': { name: 'Spanish (Dominican Republic)' },
        'es-ec': { name: 'Spanish (Ecuador)' },
        'es-sv': { name: 'Spanish (El Salvador)' },
        'es-gt': { name: 'Spanish (Guatemala)' },
        'es-hn': { name: 'Spanish (Honduras)' },
        'es-mx': { name: 'Spanish (Mexico)' },
        'es-ni': { name: 'Spanish (Nicaragua)' },
        'es-pa': { name: 'Spanish (Panama)' },
        'es-py': { name: 'Spanish (Paraguay)' },
        'es-pe': { name: 'Spanish (Peru)' },
        'es-pr': { name: 'Spanish (Puerto Rico)' },
        'es-es': { name: 'Spanish (Spain)' },
        'es-uy': { name: 'Spanish (Uruguay)' },
        'es-ve': { name: 'Spanish (Venezuela)' },
        es: { name: 'Spanish' },
        sw: { name: 'Swahili' },
        'sv-fi': { name: 'Swedish (Finland)' },
        sv: { name: 'Swedish' },
        ta: { name: 'Tamil' },
        te: { name: 'Teluga' },
        th: { name: 'Thai' },
        tr: { name: 'Turkish' },
        tk: { name: 'Turkmen' },
        uk: { name: 'Ukrainian' },
        hsb: { name: 'Upper Sorbian' },
        ur: { name: 'Urdu' },
        vi: { name: 'Vietnamese' },
        vo: { name: 'Volapuk' },
        cy: { name: 'Welsh' },
        zu: { name: 'Zulu' },
      };
    },
  };
}

export default function (ngModule) {
  ngModule.directive('counterEditor', CounterEditor);
  ngModule.directive('counterRenderer', CounterRenderer);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
        '<counter-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</counter-renderer>';

    const editTemplate = '<counter-editor></counter-editor>';
    const defaultOptions = {
      counterColName: 'counter',
      rowNumber: 1,
      targetRowNumber: 1,
      format: 'Number',
      counterLocale: 'en-us',
    };

    VisualizationProvider.registerVisualization({
      type: 'COUNTER',
      name: 'Counter',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
