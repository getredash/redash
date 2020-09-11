import { isArray, isObject, isString, isFunction, startsWith, reduce, merge, map, each } from "lodash";
import resizeObserver from "@/services/resizeObserver";
import {
  Plotly,
  prepareData,
  prepareLayout,
  updateData,
  updateYRanges,
  updateChartSize,
  updateAxesInversion,
} from "../plotly";

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

// This utility is intended to reduce amount of plot updates when multiple Plotly.relayout
// calls needed in order to compute/update the plot.
// `.append()` method takes an array of two element: first one is a object with updates for layout,
// and second is an optional function that will be called when plot is updated. That function may
// return an array with same structure if further updates needed.
// `.process()` merges all updates into a single object and calls `Plotly.relayout()`. After that
// it calls all callbacks, collects their return values and does another loop if needed.
function initPlotUpdater() {
  let actions = [];

  const updater = {
    append(action) {
      if (isArray(action) && isObject(action[0])) {
        actions.push(action);
      }
      return updater;
    },
    process(plotlyElement) {
      if (actions.length > 0) {
        const updates = reduce(actions, (updates, action) => merge(updates, action[0]), {});
        const handlers = map(actions, action => (isFunction(action[1]) ? action[1] : () => null));
        actions = [];
        return Plotly.relayout(plotlyElement, updates).then(() => {
          each(handlers, handler => updater.append(handler()));
          return updater.process(plotlyElement);
        });
      } else {
        return Promise.resolve();
      }
    },
  };

  return updater;
}

export default function initChart(container, options, data, additionalOptions, visualization, onSuccess, onError) {
  // console.log(visualization, onSuccess);

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

  let updater = initPlotUpdater();

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
    .then(() => {
      plotlyLayout.paper_bgcolor = "#1e1e1e";
      plotlyLayout.plot_bgcolor = "#1e1e1e";

      if (options.globalSeriesType !== "pie") {
        plotlyLayout.xaxis.color = "#ffffffbf";
        plotlyLayout.xaxis.zerolinecolor = "rgba(255, 255, 255, 0.12)";
        // plotlyLayout.xaxis.linecolor = "rgba(255, 255, 255, 0.12)";
        // plotlyLayout.xaxis.gridcolor = "rgba(255, 255, 255, 0.12)";
        plotlyLayout.yaxis.color = "#ffffffbf";
        plotlyLayout.yaxis.zerolinecolor = "rgba(255, 255, 255, 0.12)";
        // plotlyLayout.yaxis.linecolor = "rgba(255, 255, 255, 0.12)";
        // plotlyLayout.yaxis.gridcolor = "rgba(255, 255, 255, 0.12)";

        // if (options.globalSeriesType !== "bar") {
        //   plotlyLayout.yaxis.showgrid = true;
        //   plotlyLayout.xaxis.showgrid = false;
        // } else {
        //   plotlyLayout.xaxis.showgrid = true;
        //   plotlyLayout.yaxis.showgrid = false;
        // }
      }
      // console.log(plotlyLayout);

      plotlyLayout.legend = {
        bgcolor: "transparent",
        font: {
          color: "#ffffffbf",
        },
      };

      Plotly.newPlot(container, plotlyData, plotlyLayout, plotlyOptions);
    })
    .then(
      createSafeFunction(() =>
        updater
          .append(updateYRanges(container, plotlyLayout, options))
          .append(updateAxesInversion(plotlyData, plotlyLayout, options))
          .append(updateChartSize(container, plotlyLayout, options))
          .process(container)
      )
    )
    .then(
      createSafeFunction(() => {
        container.on("plotly_afterplot", function() {
          if (onSuccess) {
            onSuccess(true);
          }
        });
      })
    )
    .then(
      createSafeFunction(() => {
        container.on("plotly_click", function(data) {
          if (visualization.subDashboard) {
            const parameters = visualization.query.options.parameters;
            let q = "";
            if (parameters.length) {
              for (let i = 0, len = parameters.length; i < len; i++) {
                const value = `${parameters[i].urlPrefix}${parameters[i].name}=${parameters[i].value}`;
                q += value;
              }
              // console.log(q);
            }

            const keys = Object.keys(options.columnMapping);
            const axisMapping = {};
            for (let i = 0, len = keys.length; i < len; i++) {
              axisMapping[options.columnMapping[keys[i]]] = keys[i];
            }
            // console.log(axisMapping);
            localStorage.removeItem("b_dashboard");
            localStorage.removeItem("p_widget");
            localStorage.setItem(
              "b_dashboard",
              JSON.stringify({
                link: location.href,
                pathname: `/dashboards/${visualization.subDashboard}`,
                parentName: visualization.query.name,
              })
            );
            localStorage.setItem(
              "p_widget",
              JSON.stringify({
                id: visualization.widgetId,
                name: visualization.query.name,
              })
            );
            let link = `${window.location.origin}/dashboards/${visualization.subDashboard}?p_${axisMapping.x}=${
              options.invertedAxes ? data.points[0].y : data.points[0].x
            }`;

            if (q) {
              link = `${link}&${q}`;
            }

            window.location.href = link;
            // window.open(link, "_blank").focus();
          }
        });
      })
    )
    .then(
      createSafeFunction(() => {
        container.on(
          "plotly_restyle",
          createSafeFunction(updates => {
            // This event is triggered if some plotly data/layout has changed.
            // We need to catch only changes of traces visibility to update stacking
            if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
              updateData(plotlyData, options);
              updater
                .append(updateYRanges(container, plotlyLayout, options))
                .append(updateAxesInversion(plotlyData, plotlyLayout, options))
                .process(container);
            }
          })
        );

        unwatchResize = resizeObserver(
          container,
          createSafeFunction(() => {
            updater.append(updateChartSize(container, plotlyLayout, options)).process(container);
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
      container.removeAllListeners("plotly_restyle");
      unwatchResize();
      delete container.__previousSize; // added by `updateChartSize`
      Plotly.purge(container);
    }),
  };

  return result;
}
