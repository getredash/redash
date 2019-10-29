import { isObject, bind, debounce, omit } from 'lodash';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatSimpleTemplate } from '@/lib/value-format';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import getOptions from './getOptions';
import Editor from './Editor';
import countriesDataUrl from './maps/countries.geo.json';
import subdivJapanDataUrl from './maps/japan.prefectures.geo.json';

import {
  darkenColor,
  createNumberFormatter,
  prepareData,
  getValueForFeature,
  createScale,
  prepareFeatureProperties,
  getColorByValue,
} from './utils';

import template from './choropleth.html';

const loadCountriesData = bind(function loadCountriesData($http, url) {
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

    const getDataUrl = (type) => {
      switch (type) {
        case 'countries': return countriesDataUrl;
        case 'subdiv_japan': return subdivJapanDataUrl;
        default: return '';
      }
    };

    let dataUrl = getDataUrl(this.options.mapType);

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
            )), { sticky: true });
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

    const load = () => {
      loadCountriesData($http, dataUrl).then((data) => {
        if (isObject(data)) {
          countriesData = data;
          render();
        }
      });
    };

    load();


    $scope.handleResize = debounce(() => {
      if (map) {
        map.invalidateSize(false);
        updateBounds({ disableAnimation: true });
      }
    }, 50);

    $scope.$watch('$ctrl.data', render);
    $scope.$watch(() => omit(this.options, 'bounds', 'mapType'), render, true);
    $scope.$watch('$ctrl.options.bounds', updateBounds, true);
    $scope.$watch('$ctrl.options.mapType', () => {
      dataUrl = getDataUrl(this.options.mapType);
      load();
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('choroplethRenderer', ChoroplethRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'CHOROPLETH',
      name: 'Map (Choropleth)',
      getOptions,
      Renderer: angular2react('choroplethRenderer', ChoroplethRenderer, $injector),
      Editor,

      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 2,
    });
  });
}

init.init = true;
