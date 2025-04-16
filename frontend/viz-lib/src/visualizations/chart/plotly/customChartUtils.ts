import { each } from "lodash";
import { normalizeValue } from "./utils";

export function prepareCustomChartData(series: any) {
  const x: any = [];
  const ys = {};

  each(series, ({ name, data }) => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    ys[name] = [];
    each(data, point => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2-3 arguments, but got 1.
      x.push(normalizeValue(point.x));
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      ys[name].push(normalizeValue(point.y));
    });
  });

  return { x, ys };
}

export function createCustomChartRenderer(code: any, logErrorsToConsole = false) {
  // Create a function from custom code; catch syntax errors
  let render = () => {};
  try {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Function' is not assignable to type '() => v... Remove this comment to see the full error message
    render = new Function("x, ys, element, Plotly", code); // eslint-disable-line no-new-func
  } catch (err) {
    if (logErrorsToConsole) {
      console.log(`Error while executing custom graph: ${err}`); // eslint-disable-line no-console
    }
  }

  // Return function that will invoke custom code; catch runtime errors
  return (x: any, ys: any, element: any, Plotly: any) => {
    try {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 4.
      render(x, ys, element, Plotly);
    } catch (err) {
      if (logErrorsToConsole) {
        console.log(`Error while executing custom graph: ${err}`); // eslint-disable-line no-console
      }
    }
  };
}
