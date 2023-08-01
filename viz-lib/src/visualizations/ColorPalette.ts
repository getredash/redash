import { values } from "lodash";

// The following colors will be used if you pick "Automatic" color
export const BaseColors = {
  // Primary700: "#7B1FA2",
  // Primary500: "#B045E6",
  // Primary300: "#D8A2F3",
  // Primary100: "#FBF6FE",
  // Secondary700: "#BD3362",
  // Secondary500: "#EC407A",
  // Secondary300: "#F48CAF",
  // Secondary100: "#FDF8FF",
  Purple: "#B045E6",
  Red: "#EC407A",
  Yellow: "#FFD600",
  Cyan: "#00BCD4",
  Blue: "#0091EA",
  // Green: "#3BD973",
  // Orange: "#FB8D3D",
  // "Light Blue": "#799CFF",
  // Lilac: "#B554FF",
  // "Light Green": "#8CFFB4",
  // Brown: "#A55F2A",
  // Black: "#000000",
  // Gray: "#494949",
  // Pink: "#FF7DE3",
  // "Dark Blue": "#002FB4",
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
