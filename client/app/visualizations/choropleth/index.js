import _ from 'lodash';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatSimpleTemplate } from '@/lib/value-format';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';

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

export const ChoroplethPalette = _.extend({}, AdditionalColors, ColorPalette);

const DEFAULT_OPTIONS = {
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

const loadCountriesData = _.bind(function loadCountriesData($http, url) {
  if (!this[url]) {
    this[url] = $http.get(url).then(response => response.data);
  }
  return this[url];
}, {});

const ChoroplethRenderer = {
  template,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope, $element, $sanitize, $http) {
    let countriesData = null;
    let map = null;
    let choropleth = null;
    let mapMoveLock = false;

    const onMapMoveStart = () => {
      mapMoveLock = true;
    };

    const onMapMoveEnd = () => {
      const bounds = map.getBounds();
      this.options.bounds = [
        [bounds._southWest.lat, bounds._southWest.lng],
        [bounds._northEast.lat, bounds._northEast.lng],
      ];
      if (this.onOptionsChange) {
        this.onOptionsChange(this.options);
      }
      $scope.$applyAsync(() => {
        mapMoveLock = false;
      });
    };

    const updateBounds = ({ disableAnimation = false } = {}) => {
      if (mapMoveLock) {
        return;
      }
      if (map && choropleth) {
        const bounds = this.options.bounds || choropleth.getBounds();
        const options = disableAnimation ? {
          animate: false,
          duration: 0,
        } : null;
        map.fitBounds(bounds, options);
      }
    };

    const render = () => {
      if (map) {
        map.remove();
        map = null;
        choropleth = null;
      }
      if (!countriesData) {
        return;
      }

      this.formatValue = createNumberFormatter(
        this.options.valueFormat,
        this.options.noValuePlaceholder,
      );

      const data = prepareData(this.data.rows, this.options.countryCodeColumn, this.options.valueColumn);

      const { limits, colors, legend } = createScale(countriesData.features, data, this.options);

      // Update data for legend block
      this.legendItems = legend;

      choropleth = L.geoJson(countriesData, {
        onEachFeature: (feature, layer) => {
          const value = getValueForFeature(feature, data, this.options.countryCodeType);
          const valueFormatted = this.formatValue(value);
          const featureData = prepareFeatureProperties(
            feature,
            valueFormatted,
            data,
            this.options.countryCodeType,
          );
          const color = getColorByValue(value, limits, colors, this.options.colors.noValue);

          layer.setStyle({
            color: this.options.colors.borders,
            weight: 1,
            fillColor: color,
            fillOpacity: 1,
          });

          if (this.options.tooltip.enabled) {
            layer.bindTooltip($sanitize(formatSimpleTemplate(
              this.options.tooltip.template,
              featureData,
            )));
          }

          if (this.options.popup.enabled) {
            layer.bindPopup($sanitize(formatSimpleTemplate(
              this.options.popup.template,
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

      map.on('focus', () => {
        map.on('movestart', onMapMoveStart);
        map.on('moveend', onMapMoveEnd);
      });
      map.on('blur', () => {
        map.off('movestart', onMapMoveStart);
        map.off('moveend', onMapMoveEnd);
      });

      updateBounds({ disableAnimation: true });
    };

    loadCountriesData($http, countriesDataUrl).then((data) => {
      if (_.isObject(data)) {
        countriesData = data;
        render();
      }
    });

    $scope.handleResize = _.debounce(() => {
      if (map) {
        map.invalidateSize(false);
        updateBounds({ disableAnimation: true });
      }
    }, 50);

    $scope.$watch('$ctrl.data', render);
    $scope.$watch(() => _.omit(this.options, 'bounds'), render, true);
    $scope.$watch('$ctrl.options.bounds', updateBounds, true);
  },
};

const ChoroplethEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.setCurrentTab = (tab) => {
      this.currentTab = tab;
    };

    this.colors = ChoroplethPalette;

    this.clusteringModes = {
      q: 'quantile',
      e: 'equidistant',
      k: 'k-means',
    };

    this.legendPositions = {
      'top-left': 'top / left',
      'top-right': 'top / right',
      'bottom-left': 'bottom / left',
      'bottom-right': 'bottom / right',
    };

    this.countryCodeTypes = {
      name: 'Short name',
      name_long: 'Full name',
      abbrev: 'Abbreviated name',
      iso_a2: 'ISO code (2 letters)',
      iso_a3: 'ISO code (3 letters)',
      iso_n3: 'ISO code (3 digits)',
    };

    this.templateHint = `
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

    const updateCountryCodeType = () => {
      this.options.countryCodeType = inferCountryCodeType(
        this.data ? this.data.rows : [],
        this.options.countryCodeColumn,
      ) || this.options.countryCodeType;
    };

    $scope.$watch('$ctrl.options.countryCodeColumn', updateCountryCodeType);
    $scope.$watch('$ctrl.data', updateCountryCodeType);

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('choroplethRenderer', ChoroplethRenderer);
  ngModule.component('choroplethEditor', ChoroplethEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'CHOROPLETH',
      name: 'Map (Choropleth)',
      getOptions: options => _.merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('choroplethRenderer', ChoroplethRenderer, $injector),
      Editor: angular2react('choroplethEditor', ChoroplethEditor, $injector),

      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 2,
    });
  });
}

init.init = true;
