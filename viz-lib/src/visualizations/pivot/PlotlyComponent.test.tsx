import React from "react";
import { act, render, waitFor } from "@testing-library/react";

import PlotlyComponent from "./PlotlyComponent";
import { Plotly } from "@/visualizations/chart/plotly";

type MockedPlotlyElement = HTMLDivElement & {
  __handlers: Record<string, Array<() => void>>;
  data: unknown[];
  layout: Record<string, unknown>;
  on: jest.Mock;
  removeAllListeners: jest.Mock;
  removeListener: jest.Mock;
};

jest.mock("@/visualizations/chart/plotly", () => {
  const attachMethods = (element: MockedPlotlyElement) => {
    element.__handlers = element.__handlers || {};
    element.on =
      element.on ||
      jest.fn((eventName: string, handler: () => void) => {
        element.__handlers[eventName] = element.__handlers[eventName] || [];
        element.__handlers[eventName].push(handler);
      });
    element.removeListener =
      element.removeListener ||
      jest.fn((eventName: string, handler: () => void) => {
        element.__handlers[eventName] = (element.__handlers[eventName] || []).filter(
          (currentHandler) => currentHandler !== handler
        );
      });
    element.removeAllListeners =
      element.removeAllListeners ||
      jest.fn((eventName: string) => {
        element.__handlers[eventName] = [];
      });
  };

  return {
    Plotly: {
      react: jest.fn((element: MockedPlotlyElement, figure: { data?: unknown[]; layout?: Record<string, unknown> }) => {
        attachMethods(element);
        element.data = figure.data || [];
        element.layout = figure.layout || {};
        return Promise.resolve(element);
      }),
      purge: jest.fn(),
      Plots: {
        resize: jest.fn(),
      },
    },
  };
});

describe("Visualizations -> Pivot -> PlotlyComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders with Plotly.react, forwards updates, and purges on unmount", async () => {
    const onInitialized = jest.fn();
    const onUpdate = jest.fn();
    const onPurge = jest.fn();
    const data = [{ x: ["A"], y: [1], type: "bar" }] as any;
    const layout = { title: "Initial" };

    const { container, rerender, unmount } = render(
      <PlotlyComponent
        data={data}
        layout={layout}
        onInitialized={onInitialized}
        onUpdate={onUpdate}
        onPurge={onPurge}
      />
    );

    await waitFor(() => expect(Plotly.react).toHaveBeenCalledTimes(1));
    expect(onInitialized).toHaveBeenCalledTimes(1);

    const element = container.firstChild as MockedPlotlyElement;

    act(() => {
      element.__handlers.plotly_relayout[0]();
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    rerender(<PlotlyComponent data={data} layout={{ title: "Updated" }} onUpdate={onUpdate} onPurge={onPurge} />);

    await waitFor(() => expect(Plotly.react).toHaveBeenCalledTimes(2));
    expect(onUpdate).toHaveBeenCalledTimes(2);

    unmount();

    expect(onPurge).toHaveBeenCalledTimes(1);
    expect(Plotly.purge).toHaveBeenCalledWith(element);
  });
});
