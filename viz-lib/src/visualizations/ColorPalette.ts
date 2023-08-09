import { values } from "lodash";

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  Cyan: "#00BCD4",
  Blue: "#0091EA",
  Red: "#EC407A",
  Purple: "#B045E6",
  Yellow: "#FFD600",
};

// Additional colors for the user to choose from
export const AdditionalColors = {
  "Indian Red": "#981717",
  "Green 2": "#17BF51",
  "Green 3": "#049235",
  "Dark Turquoise": "#00B6EB",
  "Dark Violet": "#A58AFF",
  "Pink 2": "#C63FA9",
};

export const ColorPaletteArray = values(BaseColors);

const ColorPalette = {
  ...BaseColors,
  ...AdditionalColors,
};

export default ColorPalette;
