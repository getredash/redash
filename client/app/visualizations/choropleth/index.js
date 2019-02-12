import _ from 'lodash';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatSimpleTemplate } from '@/lib/value-format';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';

import {
  AdditionalColors,
  darkenColor,
  createNumberFormatter,
  prepareData,
  getValueForFeature,
  createScale,
  prepareFeatureProperties,
  getColorByValue,
  inferCountryCodeType,
} from './utils';

import template from './choropleth.html';
import editorTemplate from './choropleth-editor.html';

import countriesDataUrl from './countries.geo.json';

const loadCountriesData = _.bind(function loadCountriesData($http, url) {
  if (!this[url]) {
    this[url] = $http.get(url).then(response => response.data);
  }
  return this[url];
}, {});

function choroplethRenderer($sanitize, $http) {
  return {
    restrict: 'E',
    template,
    scope: {
      queryResult: '=',
      options: '=?',
    },
    link($scope, $element) {
      let countriesData = null;
      let map = null;
      let choropleth = null;
      let updateBoundsLock = false;

      function getBounds() {
        if (!updateBoundsLock) {
          const bounds = map.getBounds();
          $scope.options.bounds = [
            [bounds._southWest.lat, bounds._southWest.lng],
            [bounds._northEast.lat, bounds._northEast.lng],
          ];
          $scope.$applyAsync();
        }
      }

      function setBounds({ disableAnimation = false } = {}) {
        if (map && choropleth) {
          const bounds = $scope.options.bounds || choropleth.getBounds();
          const options = disableAnimation ? {
            animate: false,
            duration: 0,
          } : null;
          map.fitBounds(bounds, options);
        }
      }

      function render() {
        if (map) {
          map.remove();
          map = null;
          choropleth = null;
        }
        if (!countriesData) {
          return;
        }

        $scope.formatValue = createNumberFormatter(
          $scope.options.valueFormat,
          $scope.options.noValuePlaceholder,
        );

        const data = prepareData(
          $scope.queryResult.getData(),
          $scope.options.countryCodeColumn,
          $scope.options.valueColumn,
        );

        const { limits, colors, legend } = createScale(
          countriesData.features,
          data,
          $scope.options,
        );

        // Update data for legend block
        $scope.legendItems = legend;

        choropleth = L.geoJson(countriesData, {
          onEachFeature: (feature, layer) => {
            const value = getValueForFeature(feature, data, $scope.options.countryCodeType);
            const valueFormatted = $scope.formatValue(value);
            const featureData = prepareFeatureProperties(
              feature,
              valueFormatted,
              data,
              $scope.options.countryCodeType,
            );
            const color = getColorByValue(value, limits, colors, $scope.options.colors.noValue);

            layer.setStyle({
              color: $scope.options.colors.borders,
              weight: 1,
              fillColor: color,
              fillOpacity: 1,
            });

            if ($scope.options.tooltip.enabled) {
              layer.bindTooltip($sanitize(formatSimpleTemplate(
                $scope.options.tooltip.template,
                featureData,
              )));
            }

            if ($scope.options.popup.enabled) {
              layer.bindPopup($sanitize(formatSimpleTemplate(
                $scope.options.popup.template,
                featureData,
              )));
            }

            layer.on('mouseover', () => {
              layer.setStyle({
                weight: 2,
                fillColor: darkenColor(color),
              });
            });
            layer.on('mouseout', () => {
              layer.setStyle({
                weight: 1,
                fillColor: color,
              });
            });
          },
        });

        const choroplethBounds = choropleth.getBounds();

        map = L.map($element[0].children[0].children[0], {
          center: choroplethBounds.getCenter(),
          zoom: 1,
          zoomSnap: 0,
          layers: [choropleth],
          scrollWheelZoom: false,
          maxBounds: choroplethBounds,
          maxBoundsViscosity: 1,
          attributionControl: false,
          fullscreenControl: true,
        });

        map.on('focus', () => { map.on('moveend', getBounds); });
        map.on('blur', () => { map.off('moveend', getBounds); });

        setBounds({ disableAnimation: true });
      }

      loadCountriesData($http, countriesDataUrl).then((data) => {
        if (_.isObject(data)) {
          countriesData = data;
          render();
        }
      });

      $scope.handleResize = _.debounce(() => {
        if (map) {
          map.invalidateSize(false);
          setBounds({ disableAnimation: true });
        }
      }, 50);

      $scope.$watch('queryResult && queryResult.getData()', render);
      $scope.$watch(() => _.omit($scope.options, 'bounds'), render, true);
      $scope.$watch('options.bounds', () => {
        // Prevent infinite digest loop
        const savedLock = updateBoundsLock;
        updateBoundsLock = true;
        setBounds();
        updateBoundsLock = savedLock;
      }, true);
    },
  };
}

function choroplethEditor(ChoroplethPalette) {
  return {
    restrict: 'E',
    template: editorTemplate,
    scope: {
      queryResult: '=',
      options: '=?',
    },
    link($scope) {
      $scope.currentTab = 'general';
      $scope.changeTab = (tab) => {
        $scope.currentTab = tab;
      };

      $scope.colors = ChoroplethPalette;

      $scope.clusteringModes = {
        q: 'quantile',
        e: 'equidistant',
        k: 'k-means',
      };

      $scope.legendPositions = {
        'top-left': 'top / left',
        'top-right': 'top / right',
        'bottom-left': 'bottom / left',
        'bottom-right': 'bottom / right',
      };

      $scope.countryCodeTypes = {
        name: 'Short name',
        name_long: 'Full name',
        abbrev: 'Abbreviated name',
        iso_a2: 'ISO code (2 letters)',
        iso_a3: 'ISO code (3 letters)',
        iso_n3: 'ISO code (3 digits)',
      };

      $scope.templateHint = `
        <div class="p-b-5">All query result columns can be referenced using <code>{{ column_name }}</code> syntax.</div>
        <div class="p-b-5">Use special names to access additional properties:</div>
        <div><code>{{ @@value }}</code> formatted value;</div>
        <div><code>{{ @@name }}</code> short country name;</div>
        <div><code>{{ @@name_long }}</code> full country name;</div>
        <div><code>{{ @@abbrev }}</code> abbreviated country name;</div>
        <div><code>{{ @@iso_a2 }}</code> two-letter ISO country code;</div>
        <div><code>{{ @@iso_a3 }}</code> three-letter ISO country code;</div>
        <div><code>{{ @@iso_n3 }}</code> three-digit ISO country code.</div>
        <div class="p-t-5">This syntax is applicable to tooltip and popup templates.</div>
      `;

      function updateCountryCodeType() {
        $scope.options.countryCodeType = inferCountryCodeType(
          $scope.queryResult.getData(),
          $scope.options.countryCodeColumn,
        ) || $scope.options.countryCodeType;
      }

      $scope.$watch('options.countryCodeColumn', updateCountryCodeType);
      $scope.$watch('queryResult.getData()', updateCountryCodeType);
    },
  };
}

export default function init(ngModule) {
  ngModule.constant('ChoroplethPalette', {});
  ngModule.directive('choroplethRenderer', choroplethRenderer);
  ngModule.directive('choroplethEditor', choroplethEditor);
  ngModule.config((VisualizationProvider, ColorPalette, ChoroplethPalette) => {
    _.extend(ChoroplethPalette, AdditionalColors, ColorPalette);

    const renderTemplate =
      '<choropleth-renderer options="visualization.options" query-result="queryResult"></choropleth-renderer>';

    const editTemplate = '<choropleth-editor options="visualization.options" query-result="queryResult"></choropleth-editor>';

    const defaultOptions = {
      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 2,

      countryCodeColumn: '',
      countryCodeType: 'iso_a3',
      valueColumn: '',
      clusteringMode: 'e',
      steps: 5,
      valueFormat: '0,0.00',
      noValuePlaceholder: 'N/A',
      colors: {
        min: ChoroplethPalette['Light Blue'],
        max: ChoroplethPalette['Dark Blue'],
        background: ChoroplethPalette.White,
        borders: ChoroplethPalette.White,
        noValue: ChoroplethPalette['Light Gray'],
      },
      legend: {
        visible: true,
        position: 'bottom-left',
        alignText: 'right',
      },
      tooltip: {
        enabled: true,
        template: '<b>{{ @@name }}</b>: {{ @@value }}',
      },
      popup: {
        enabled: true,
        template: 'Country: <b>{{ @@name_long }} ({{ @@iso_a2 }})</b>\n<br>\nValue: <b>{{ @@value }}</b>',
      },
    };

    VisualizationProvider.registerVisualization({
      type: 'CHOROPLETH',
      name: 'Map (Choropleth)',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}

init.init = true;
