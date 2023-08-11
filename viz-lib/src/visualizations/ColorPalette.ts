import { values } from "lodash";

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  Purple: "#B045E6",
  "Purple 2": "#C87DEE",
  Red: "#EC407A",
  Pink: "#F06695",
  Orange: "FB8C00",
  Yellow: "#FFD600",
  Olive: "#4CAF50",
  Green: "#00BFA5",
  Turquoise: "#00BCD4",
  Blue: "#0091EA",
};

// Additional colors for the user to choose from
export const AdditionalColors = {};

export const ColorPaletteArray = values(BaseColors);

const ColorPalette = {
  ...BaseColors,
  ...AdditionalColors,
};

export default ColorPalette;
