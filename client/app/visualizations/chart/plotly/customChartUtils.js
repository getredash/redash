import { each } from "lodash";
import { normalizeValue } from "./utils";

export function prepareCustomChartData(series) {
  const x = [];
  const ys = {};

  each(series, ({ name, data }) => {
    ys[name] = [];
    each(data, point => {
      x.push(normalizeValue(point.x));
      ys[name].push(normalizeValue(point.y));
    });
  });

  return { x, ys };
}

export function createCustomChartRenderer(code, logErrorsToConsole = false) {
  // Create a function from custom code; catch syntax errors
  let render = () => {};
  try {
    render = new Function("x, ys, element, Plotly", code); // eslint-disable-line no-new-func
  } catch (err) {
    if (logErrorsToConsole) {
      console.log(`Error while executing custom graph: ${err}`); // eslint-disable-line no-console
    }
  }

  // Return function that will invoke custom code; catch runtime errors
  return (x, ys, element, Plotly) => {
    try {
      render(x, ys, element, Plotly);
    } catch (err) {
      if (logErrorsToConsole) {
        console.log(`Error while executing custom graph: ${err}`); // eslint-disable-line no-console
      }
    }
  };
}
