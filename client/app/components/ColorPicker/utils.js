import { isArray, findKey } from "lodash";
import tinycolor from "tinycolor2";

export function validateColor(value, fallback = null) {
  value = tinycolor(value);
  return value.isValid() ? "#" + value.toHex().toUpperCase() : fallback;
}

export function getColorName(color, presetColors) {
  if (isArray(presetColors)) {
    return color;
  }
  return findKey(presetColors, v => validateColor(v) === color) || color;
}
