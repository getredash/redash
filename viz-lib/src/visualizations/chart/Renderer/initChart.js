import { isArray, isObject, isString, startsWith } from "lodash";
import resizeObserver from "@/services/resizeObserver";
import { Plotly, prepareData, prepareLayout, updateData, updateLayout, applyLayoutFixes } from "../plotly";

function createErrorHandler(errorHandler) {
  return error => {
    // This error happens only when chart width is 20px and looks that
    // it's safe to just ignore it: 1px less or more and chart will get fixed.
    if (isString(error) && startsWith(error, "ax.dtick error")) {
      return;
    }
    errorHandler(error);
  };
}

export default function initChart(container, options, data, additionalOptions, onError) {
  const handleError = createErrorHandler(onError);

  const plotlyOptions = {
    showLink: false,
    displaylogo: false,
  };

  if (additionalOptions.hidePlotlyModeBar) {
    plotlyOptions.displayModeBar = false;
  }

  const plotlyData = prepareData(data, options);
  const plotlyLayout = prepareLayout(container, options, plotlyData);

  let isDestroyed = false;

  function createSafeFunction(fn) {
    return (...args) => {
      if (!isDestroyed) {
        try {
          return fn(...args);
        } catch (error) {
          handleError(error);
        }
      }
    };
  }

  let unwatchResize = () => {};

  const promise = Promise.resolve()
    .then(() => Plotly.newPlot(container, plotlyData, plotlyLayout, plotlyOptions))
    .then(createSafeFunction(() => updateLayout(plotlyLayout, options, u => Plotly.relayout(container, u))))
    .then(createSafeFunction(() => applyLayoutFixes(container, plotlyLayout, options, (e, u) => Plotly.relayout(e, u))))
    .then(
      createSafeFunction(() => {
        container.on(
          "plotly_restyle",
          createSafeFunction(updates => {
            // This event is triggered if some plotly data/layout has changed.
            // We need to catch only changes of traces visibility to update stacking
            if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
              updateData(plotlyData, options);
              updateLayout(plotlyLayout, options, u => Plotly.relayout(container, u));
            }
          })
        );

        unwatchResize = resizeObserver(
          container,
          createSafeFunction(() => {
            applyLayoutFixes(container, plotlyLayout, options, (e, u) => Plotly.relayout(e, u));
          })
        );
      })
    )
    .catch(handleError);

  const result = {
    initialized: promise.then(() => result),
    setZoomEnabled: createSafeFunction(allowZoom => {
      const layoutUpdates = { dragmode: allowZoom ? "zoom" : false };
      return Plotly.relayout(container, layoutUpdates);
    }),
    destroy: createSafeFunction(() => {
      isDestroyed = true;
      container.off("plotly_restyle");
      unwatchResize();
      Plotly.purge(container);
    }),
  };

  return result;
}
