import { isArray, findKey } from "lodash";
import tinycolor from "tinycolor2";

export function validateColor(value: any, fallback = null) {
  value = tinycolor(value);
  return value.isValid() ? "#" + value.toHex().toUpperCase() : fallback;
}

export function getColorName(color: any, presetColors: any) {
  if (isArray(presetColors)) {
    return color;
  }
  return findKey(presetColors, v => validateColor(v) === color) || color;
}
