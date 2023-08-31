import { values } from "lodash";

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  Cyan: "#00BCD4",
  Yellow: "#FFD600",
  Blue: "#0091EA",
  Purple: "#B045E6",
  "Purple 2": "#C87DEE",
  Red: "#EC407A",
};

// Additional colors for the user to choose from
export const AdditionalColors = {};

export const ColorPaletteArray = values(BaseColors);

const ColorPalette = {
  ...BaseColors,
  ...AdditionalColors,
};

export default ColorPalette;
