import chroma from 'chroma-js';
import _ from 'underscore';
import { createFormatter } from '@/lib/value-format';

export const AdditionalColors = {
  White: '#ffffff',
  Black: '#000000',
  'Light Gray': '#dddddd',
};

export function darkenColor(color) {
  return chroma(color).darken().hex();
}

export function createNumberFormatter(format, placeholder) {
  const formatter = createFormatter({
    displayAs: 'number',
    numberFormat: format,
  });
  return (value) => {
    if (_.isNumber(value) && isFinite(value)) {
      return formatter(value);
    }
    return placeholder;
  };
}

export function prepareData(data, countryCodeField, valueField) {
  if (!countryCodeField || !valueField) {
    return {};
  }

  const result = {};
  _.each(data, (item) => {
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

export function prepareFeatureProperties(feature, valueFormatted, data, countryCodeType) {
  const result = {};
  _.each(feature.properties, (value, key) => {
    result['@@' + key] = value;
  });
  result['@@value'] = valueFormatted;
  const datum = data[feature.properties[countryCodeType]] || {};
  return _.extend(result, datum.item);
}

export function getValueForFeature(feature, data, countryCodeType) {
  const code = feature.properties[countryCodeType];
  if (_.isString(code) && _.isObject(data[code])) {
    return data[code].value;
  }
  return undefined;
}

export function getColorByValue(value, limits, colors, defaultColor) {
  if (_.isNumber(value) && isFinite(value)) {
    for (let i = 0; i < limits.length; i += 1) {
      if (value <= limits[i]) {
        return colors[i];
      }
    }
  }
  return defaultColor;
}

export function createScale(features, data, options) {
  // Calculate limits
  const values = _.uniq(_.filter(
    _.map(features, feature => getValueForFeature(feature, data, options.countryCodeType)),
    _.isNumber,
  ));
  if (values.length === 0) {
    return {
      limits: [],
      colors: [],
      legend: [],
    };
  }
  const steps = Math.min(values.length, options.steps);
  if (steps === 1) {
    return {
      limits: values,
      colors: [options.colors.max],
      legend: [{
        color: options.colors.max,
        limit: _.first(values),
      }],
    };
  }
  const limits = chroma.limits(values, options.clusteringMode, steps - 1);

  // Create color buckets
  const colors = chroma.scale([options.colors.min, options.colors.max])
    .colors(limits.length);

  // Group values for legend
  const legend = _.map(colors, (color, index) => ({
    color,
    limit: limits[index],
  })).reverse();

  return { limits, colors, legend };
}

export function inferCountryCodeType(data, countryCodeField) {
  const regex = {
    iso_a2: /^[a-z]{2}$/i,
    iso_a3: /^[a-z]{3}$/i,
    iso_n3: /^[0-9]{3}$/i,
  };

  const result = _.chain(data)
    .reduce((memo, item) => {
      const value = item[countryCodeField];
      if (_.isString(value)) {
        _.each(regex, (r, k) => {
          memo[k] += r.test(value) ? 1 : 0;
        });
      }
      return memo;
    }, {
      iso_a2: 0,
      iso_a3: 0,
      iso_n3: 0,
    })
    .pairs()
    .max(item => item[1])
    .value();

  return (result[1] / data.length) >= 0.9 ? result[0] : null;
}
