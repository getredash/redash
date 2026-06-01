import React from "react";
import type { CSSProperties } from "react";
import type { Config, Data, Frame, Layout, PlotlyHTMLElement } from "plotly.js";
import { Plotly } from "@/visualizations/chart/plotly";

type Figure = {
  data: Data[];
  layout: Partial<Layout>;
  frames: Frame[] | null;
};

type FigureCallback = (figure: Readonly<Figure>, graphDiv: Readonly<PlotlyHTMLElement>) => void;

type PlotlyElement = PlotlyHTMLElement & {
  _transitionData?: {
    _frames?: Frame[];
  };
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
};

type Props = {
  className?: string;
  config?: Partial<Config>;
  data?: Data[];
  debug?: boolean;
  divId?: string;
  frames?: Frame[];
  layout?: Partial<Layout>;
  onError?: (error: Readonly<Error>) => void;
  onInitialized?: FigureCallback;
  onPurge?: FigureCallback;
  onUpdate?: FigureCallback;
  style?: CSSProperties;
  useResizeHandler?: boolean;
};

const DEFAULT_STYLE: CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const UPDATE_EVENTS = [
  "plotly_restyle",
  "plotly_redraw",
  "plotly_relayout",
  "plotly_relayouting",
  "plotly_doubleclick",
  "plotly_animated",
  "plotly_sunburstclick",
] as const;

export default class PlotlyComponent extends React.PureComponent<Props> {
  static defaultProps = {
    data: [],
    debug: false,
    useResizeHandler: false,
    style: DEFAULT_STYLE,
  };

  private element: PlotlyElement | null = null;

  private hasInitialized = false;

  private queue = Promise.resolve();

  private resizeHandler: (() => void) | null = null;

  private updateEventsAttached = false;

  private unmounting = false;

  componentDidMount() {
    this.unmounting = false;
    this.updatePlotly(true);
  }

  componentDidUpdate(previousProps: Props) {
    const previousFramesCount = previousProps.frames?.length ?? 0;
    const nextFramesCount = this.props.frames?.length ?? 0;
    const figureChanged = !(
      previousProps.data === this.props.data &&
      previousProps.layout === this.props.layout &&
      previousProps.config === this.props.config &&
      previousFramesCount === nextFramesCount
    );

    if (figureChanged) {
      this.updatePlotly(false);
      return;
    }

    if (previousProps.useResizeHandler !== this.props.useResizeHandler) {
      this.syncWindowResize(false);
    }
  }

  componentWillUnmount() {
    this.unmounting = true;

    if (this.element) {
      this.figureCallback(this.props.onPurge);
    }

    this.detachWindowResize();
    this.removeUpdateEvents();

    if (this.element) {
      Plotly.purge(this.element);
    }
  }

  private detachWindowResize() {
    if (typeof window === "undefined" || !this.resizeHandler) {
      return;
    }

    window.removeEventListener("resize", this.resizeHandler);
    this.resizeHandler = null;
  }

  private setRef = (element: HTMLDivElement | null) => {
    this.element = element as PlotlyElement | null;

    if (this.props.debug && typeof window !== "undefined") {
      (window as Window & { gd?: PlotlyElement | null }).gd = this.element;
    }
  };

  private handleUpdate = () => {
    this.figureCallback(this.props.onUpdate);
  };

  private updatePlotly(invokeResizeHandler: boolean) {
    this.queue = this.queue
      .then(() => {
        if (!this.element || this.unmounting) {
          return;
        }

        return (Plotly.react as any)(this.element, {
          data: this.props.data,
          layout: this.props.layout,
          config: this.props.config,
          frames: this.props.frames,
        });
      })
      .then(() => {
        if (!this.element || this.unmounting) {
          return;
        }

        this.syncWindowResize(invokeResizeHandler);
        this.attachUpdateEvents();
        this.figureCallback(this.hasInitialized ? this.props.onUpdate : this.props.onInitialized);
        this.hasInitialized = true;
      })
      .catch((error: Error) => {
        if (this.props.onError) {
          this.props.onError(error);
        }
      });
  }

  private figureCallback(callback?: FigureCallback) {
    if (!callback || !this.element) {
      return;
    }

    callback(
      {
        data: this.element.data,
        layout: this.element.layout,
        frames: this.element._transitionData?._frames ?? null,
      },
      this.element
    );
  }

  private syncWindowResize(invokeHandler: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    if (this.props.useResizeHandler && this.element && !this.resizeHandler) {
      this.resizeHandler = () => {
        if (this.element) {
          Plotly.Plots.resize(this.element);
        }
      };

      window.addEventListener("resize", this.resizeHandler);

      if (invokeHandler) {
        this.resizeHandler();
      }

      return;
    }

    if (!this.props.useResizeHandler && this.resizeHandler) {
      this.detachWindowResize();
    }
  }

  private attachUpdateEvents() {
    if (!this.element || this.updateEventsAttached) {
      return;
    }

    UPDATE_EVENTS.forEach((eventName) => {
      this.element?.on(eventName as any, this.handleUpdate);
    });
    this.updateEventsAttached = true;
  }

  private removeUpdateEvents() {
    if (!this.element || !this.updateEventsAttached) {
      return;
    }

    UPDATE_EVENTS.forEach((eventName) => {
      if (this.element?.removeListener) {
        this.element.removeListener(eventName, this.handleUpdate);
      } else {
        this.element?.removeAllListeners(eventName);
      }
    });
    this.updateEventsAttached = false;
  }

  render() {
    return <div id={this.props.divId} ref={this.setRef} className={this.props.className} style={this.props.style} />;
  }
}
