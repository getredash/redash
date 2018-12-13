import React from 'react';
import PropTypes from 'prop-types';
import { each, extend, filter, first, isNumber, isObject, isString, map, uniq, values } from 'lodash';
import 'leaflet/dist/leaflet.css';
// eslint-disable-next-line no-unused-vars
import L from 'leaflet';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { Map, GeoJSON } from 'react-leaflet';
import chroma from 'chroma-js';
import { connect, PromiseState } from 'react-refetch';

import { QueryData } from '@/components/proptypes';
import { ColorPalette } from '@/visualizations/chart/plotly/utils';
import { createFormatter, formatSimpleTemplate } from '@/lib/value-format';
import countriesDataUrl from './countries.geo.json';

const ChoroplethPalette = Object.freeze({
  ...ColorPalette,
  White: '#ffffff',
  Black: '#000000',
  'Light Gray': '#dddddd',
});

function darkenColor(color) {
  return chroma(color).darken().hex();
}

function createNumberFormatter(format, placeholder) {
  const formatter = createFormatter({
    displayAs: 'number',
    numberFormat: format,
  });
  return (value) => {
    if (isNumber(value) && isFinite(value)) {
      return formatter(value);
    }
    return placeholder;
  };
}

function prepareData(data, countryCodeField, valueField) {
  if (!countryCodeField || !valueField) {
    return {};
  }

  const result = {};
  each(data, (item) => {
    if (item[countryCodeField]) {
      const value = parseFloat(item[valueField]);
      result[item[countryCodeField]] = {
        code: item[countryCodeField],
        value: isFinite(value) ? value : undefined,
        item,
      };
    }
  });
  return result;
}

function prepareFeatureProperties(feature, valueFormatted, data, countryCodeType) {
  const result = {};
  each(feature.properties, (value, key) => {
    result['@@' + key] = value;
  });
  result['@@value'] = valueFormatted;
  const datum = data[feature.properties[countryCodeType]] || {};
  return extend(result, datum.item);
}

function getValueForFeature(feature, data, countryCodeType) {
  const code = feature.properties[countryCodeType];
  if (isString(code) && isObject(data[code])) {
    return data[code].value;
  }
  return undefined;
}

function getColorByValue(value, limits, colors, defaultColor) {
  if (isNumber(value) && isFinite(value)) {
    for (let i = 0; i < limits.length; i += 1) {
      if (value <= limits[i]) {
        return colors[i];
      }
    }
  }
  return defaultColor;
}

function createScale(features, data, options) {
  // Calculate limits
  const scaleValues = uniq(filter(
    map(features, feature => getValueForFeature(feature, data, options.countryCodeType)),
    isNumber,
  ));
  if (scaleValues.length === 0) {
    return {
      limits: [],
      colors: [],
      legend: [],
    };
  }
  const steps = Math.min(scaleValues.length, options.steps);
  if (steps === 1) {
    return {
      limits: scaleValues,
      colors: [options.colors.max],
      legend: [{
        color: options.colors.max,
        limit: first(scaleValues),
      }],
    };
  }
  const limits = chroma.limits(scaleValues, options.clusteringMode, steps - 1);

  // Create color buckets
  const colors = chroma.scale([options.colors.min, options.colors.max])
    .colors(limits.length);

  // Group values for legend
  const legend = map(colors, (color, index) => ({
    color,
    limit: limits[index],
  })).reverse();

  return { limits, colors, legend };
}

const Color = PropTypes.oneOf(values(ChoroplethPalette));
const ChoroplethOptions = PropTypes.shape({
  bounds: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  viewport: PropTypes.exact({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }),
  countryCodeColumn: PropTypes.string.isRequired,
  countryCodeType: PropTypes.oneOf(['name', 'name_long', 'abbrev', 'iso_a2', 'iso_a3', 'iso_n3']).isRequired,
  valueColumn: PropTypes.string.isRequired,
  clusteringMode: PropTypes.oneOf(['q', 'e', 'k']).isRequired,
  steps: PropTypes.number.isRequired,
  valueFormat: PropTypes.string.isRequired,
  noValuePlaceholder: PropTypes.string.isRequired,
  colors: PropTypes.exact({
    min: Color.isRequired,
    max: Color.isRequired,
    background: Color.isRequired,
    borders: Color.isRequired,
    noValue: Color.isRequired,
  }).isRequired,
  legend: PropTypes.exact({
    visible: PropTypes.bool.isRequired,
    position: PropTypes.oneOf(['top-left', 'top-right', 'bottom-left', 'bottom-right']).isRequired,
    alignText: PropTypes.oneOf(['left', 'right', 'center']).isRequired,
  }).isRequired,
  tooltip: PropTypes.exact({
    enabled: PropTypes.bool.isRequired,
    template: PropTypes.string.isRequired,
  }),
  popup: PropTypes.exact({
    enabled: PropTypes.bool.isRequired,
    template: PropTypes.string.isRequired,
  }),
});

class ChoroplethRenderer extends React.Component {
  static ChoroplethPalette = ChoroplethPalette
  static Options = ChoroplethOptions
  static DEFAULT_OPTIONS = Object.freeze({
    viewport: { center: [0, 0], zoom: 1 },
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
    colors: Object.freeze({
      min: ChoroplethPalette['Light Blue'],
      max: ChoroplethPalette['Dark Blue'],
      background: ChoroplethPalette.White,
      borders: ChoroplethPalette.White,
      noValue: ChoroplethPalette['Light Gray'],
    }),
    legend: Object.freeze({
      visible: true,
      position: 'bottom-left',
      alignText: 'right',
    }),
    tooltip: Object.freeze({
      enabled: true,
      template: '<b>{{ @@name }}</b>: {{ @@value }}',
    }),
    popup: Object.freeze({
      enabled: true,
      template: 'Country: <b>{{ @@name_long }} ({{ @@iso_a2 }})</b>\n<br>\nValue: <b>{{ @@value }}</b>',
    }),
  })

  static propTypes = {
    countriesData: PropTypes.instanceOf(PromiseState).isRequired,
    data: QueryData.isRequired,
    options: ChoroplethOptions.isRequired,
    updateOptions: PropTypes.func.isRequired,
    listenForResize: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.props.listenForResize(() => {
      if (this.mapRef.current) {
        this.mapRef.current.leafletElement.invalidateSize();
      }
    });
  }

  mapRef = React.createRef()

  updateViewport = viewport => this.props.updateOptions({ viewport })

  render() {
    if (!this.props.countriesData.fulfilled) return null;
    const opts = this.props.options;
    const data = prepareData(
      this.props.data.rows,
      opts.countryCodeColumn,
      opts.valueColumn,
    );
    const formatValue = createNumberFormatter(opts.valueFormat, opts.noValuePlaceholder);
    const { limits, colors, legend } = createScale(
      this.props.countriesData.value.features,
      data,
      opts,
    );
    const viewport = opts.viewport || null;

    return (
      <div className="map-visualization-container">
        <Map
          style={{ background: opts.colors.background }}
          ref={this.mapRef}
          zoom={1}
          zoomSnap={0}
          scrollWheelZoom={false}
          maxBoundsViscosity={1}
          attributionControl={false}
          fullscreenControl
          bounds={viewport ? null : opts.bounds}
          viewport={viewport}
          onViewportChanged={this.updateViewport}
        >
          <GeoJSON
            data={this.props.countriesData.value}
            onEachFeature={(feature, layer) => {
              const value = getValueForFeature(feature, data, opts.countryCodeType);
              const valueFormatted = formatValue(value);
              const featureData = prepareFeatureProperties(
                feature,
                valueFormatted,
                data,
                opts.countryCodeType,
              );
              const color = getColorByValue(value, limits, colors, opts.colors.noValue);

              layer.setStyle({
                color: opts.colors.borders,
                weight: 1,
                fillColor: color,
                fillOpacity: 1,
              });

              if (opts.tooltip.enabled) {
                // XXX xss risk
                layer.bindTooltip(formatSimpleTemplate(opts.tooltip.template, featureData));
              }

              if (opts.popup.enabled) {
                // XXX xss risk
                layer.bindPopup(formatSimpleTemplate(opts.popup.template, featureData));
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
            }}
          />
        </Map>
        {opts.legend.visible && (legend.length > 0) ?
          <div className={`leaflet-bar map-custom-control ${opts.legend.position}`}>
            {legend.map(item => (
              <div className="d-flex align-items-center">
                <span
                  className="m-0"
                  style={{
                  lineHeight: 1,
                  width: 12,
                  height: 12,
                  'background-color': item.color,
                  display: 'inline-block',
                  'margin-right': 5,
                  }}
                />
                <div className={`flex-fill text-${opts.legend.alignText}`}>{formatValue(item.limit)}</div>
              </div>))}
          </div> : null }
      </div>

    );
  }
}

function fetchCountriesData() {
  return {
    countriesData: {
      url: countriesDataUrl,
    },
  };
}

export default connect(fetchCountriesData)(ChoroplethRenderer);
