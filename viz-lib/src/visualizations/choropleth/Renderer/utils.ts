import { isString, isObject, isFinite, each, map, extend, uniq, filter, first } from "lodash";
import chroma from "chroma-js";
import { createNumberFormatter as createFormatter } from "@/lib/value-format";

export function darkenColor(color: any) {
  return chroma(color)
    .darken()
    .hex();
}

export function createNumberFormatter(format: any, placeholder: any) {
  const formatter = createFormatter(format);
  return (value: any) => {
    if (isFinite(value)) {
      return formatter(value);
    }
    return placeholder;
  };
}

export function prepareData(data: any, keyColumn: any, valueColumn: any) {
  if (!keyColumn || !valueColumn) {
    return {};
  }

  const result = {};
  each(data, item => {
    if (item[keyColumn]) {
      const value = parseFloat(item[valueColumn]);
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      result[item[keyColumn]] = {
        code: item[keyColumn],
        value: isFinite(value) ? value : undefined,
        item,
      };
    }
  });
  return result;
}

export function prepareFeatureProperties(feature: any, valueFormatted: any, data: any, targetField: any) {
  const result = {};
  each(feature.properties, (value, key) => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    result["@@" + key] = value;
  });
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  result["@@value"] = valueFormatted;
  const datum = data[feature.properties[targetField]] || {};
  return extend(result, datum.item);
}

export function getValueForFeature(feature: any, data: any, targetField: any) {
  const code = feature.properties[targetField];
  if (isString(code) && isObject(data[code])) {
    return data[code].value;
  }
  return undefined;
}

export function getColorByValue(value: any, limits: any, colors: any, defaultColor: any) {
  if (isFinite(value)) {
    for (let i = 0; i < limits.length; i += 1) {
      if (value <= limits[i]) {
        return colors[i];
      }
    }
  }
  return defaultColor;
}

export function createScale(features: any, data: any, options: any) {
  // Calculate limits
  const values = uniq(
    filter(
      map(features, feature => getValueForFeature(feature, data, options.targetField)),
      isFinite
    )
  );
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
      legend: [
        {
          color: options.colors.max,
          limit: first(values),
        },
      ],
    };
  }
  const limits = chroma.limits(values, options.clusteringMode, steps - 1);

  // Create color buckets
  const colors = chroma.scale([options.colors.min, options.colors.max]).colors(limits.length);

  // Group values for legend
  const legend = map(colors, (color, index) => ({
    color,
    limit: limits[index],
  })).reverse();

  return { limits, colors, legend };
}
