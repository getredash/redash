import { values } from "lodash";

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  Purple: "#B045E6",
  "Purple 2": "#C87DEE",
  Red: "#EC407A",
  Peach: "#F06695",
  Yellow: "#FFD600",
  Blue: "#0091EA",
  "Extra Blue": "#80C8F4",
  "Accent Green": "#00BFA5",
  Cyan: "#00BCD4",
  "Extra Green": "#80DFD2",
};

// Additional colors for the user to choose from
export const AdditionalColors = {};

export const ColorPaletteArray = values(BaseColors);

const ColorPalette = {
  ...BaseColors,
  ...AdditionalColors,
};

export default ColorPalette;
