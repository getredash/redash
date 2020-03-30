import { includes, reduce, some } from "lodash";

// TODO: Revisit this implementation when migrating widget component to React

const WIDGET_SELECTOR = '[data-widgetid="{0}"]';
const WIDGET_CONTENT_SELECTOR = [
  ".widget-header", // header
  ".visualization-renderer", // visualization
  ".scrollbox .alert", // error state
  ".spinner-container", // loading state
  ".tile__bottom-control", // footer
].join(",");
const INTERVAL = 200;

export default class AutoHeightController {
  widgets = {};

  interval = null;

  onHeightChange = null;

  constructor(handler) {
    this.onHeightChange = handler;
  }

  update(widgets) {
    const newWidgetIds = widgets
      .filter(widget => widget.options.position.autoHeight)
      .map(widget => widget.id.toString());

    // added
    newWidgetIds.filter(id => !includes(Object.keys(this.widgets), id)).forEach(this.add);

    // removed
    Object.keys(this.widgets)
      .filter(id => !includes(newWidgetIds, id))
      .forEach(this.remove);
  }

  add = id => {
    if (this.isEmpty()) {
      this.start();
    }

    const selector = WIDGET_SELECTOR.replace("{0}", id);
    this.widgets[id] = [
      function getHeight() {
        const widgetEl = document.querySelector(selector);
        if (!widgetEl) {
          return undefined; // safety
        }

        // get all content elements
        const els = widgetEl.querySelectorAll(WIDGET_CONTENT_SELECTOR);

        // calculate accumulated height
        return reduce(
          els,
          (acc, el) => {
            const height = el ? el.getBoundingClientRect().height : 0;
            return acc + height;
          },
          0
        );
      },
    ];
  };

  remove = id => {
    // ignore if not an active autoHeight widget
    if (!this.exists(id)) {
      return;
    }

    // not actually deleting from this.widgets to prevent case of unwanted re-adding
    this.widgets[id.toString()] = false;

    if (this.isEmpty()) {
      this.stop();
    }
  };

  exists = id => !!this.widgets[id.toString()];

  isEmpty = () => !some(this.widgets);

  checkHeightChanges = () => {
    Object.keys(this.widgets)
      .filter(this.exists) // reject already removed items
      .forEach(id => {
        const [getHeight, prevHeight] = this.widgets[id];
        const height = getHeight();
        if (height && height !== prevHeight) {
          this.widgets[id][1] = height; // save
          this.onHeightChange(id, height); // dispatch
        }
      });
  };

  start = () => {
    this.stop();
    this.interval = setInterval(this.checkHeightChanges, INTERVAL);
  };

  stop = () => {
    clearInterval(this.interval);
  };

  resume = () => {
    if (!this.isEmpty()) {
      this.start();
    }
  };

  destroy = () => {
    this.stop();
    this.widgets = null;
  };
}
