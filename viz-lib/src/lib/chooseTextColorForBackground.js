import { maxBy } from "lodash";
import chroma from "chroma-js";

export default function chooseTextColorForBackground(backgroundColor, textColors = ["#ffffff", "#333333"]) {
  try {
    backgroundColor = chroma(backgroundColor);
    return maxBy(textColors, color => chroma.contrast(backgroundColor, color));
  } catch (e) {
    return null;
  }
}
