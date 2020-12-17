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

  constructor(handler: any) {
    this.onHeightChange = handler;
  }

  update(widgets: any) {
    const newWidgetIds = widgets
      .filter((widget: any) => widget.options.position.autoHeight)
      .map((widget: any) => widget.id.toString());

    // added
    newWidgetIds.filter((id: any) => !includes(Object.keys(this.widgets), id)).forEach(this.add);

    // removed
    Object.keys(this.widgets)
      .filter(id => !includes(newWidgetIds, id))
      .forEach(this.remove);
  }

  add = (id: any) => {
    if (this.isEmpty()) {
      this.start();
    }

    const selector = WIDGET_SELECTOR.replace("{0}", id);
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

  remove = (id: any) => {
    // ignore if not an active autoHeight widget
    if (!this.exists(id)) {
      return;
    }

    // not actually deleting from this.widgets to prevent case of unwanted re-adding
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    this.widgets[id.toString()] = false;

    if (this.isEmpty()) {
      this.stop();
    }
  };

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  exists = (id: any) => !!this.widgets[id.toString()];

  isEmpty = () => !some(this.widgets);

  checkHeightChanges = () => {
    Object.keys(this.widgets)
      .filter(this.exists) // reject already removed items
      .forEach(id => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const [getHeight, prevHeight] = this.widgets[id];
        const height = getHeight();
        if (height && height !== prevHeight) {
          // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          this.widgets[id][1] = height; // save
          // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
          this.onHeightChange(id, height); // dispatch
        }
      });
  };

  start = () => {
    this.stop();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'null'.
    this.interval = setInterval(this.checkHeightChanges, INTERVAL);
  };

  stop = () => {
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    clearInterval(this.interval);
  };

  resume = () => {
    if (!this.isEmpty()) {
      this.start();
    }
  };

  destroy = () => {
    this.stop();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type '{}'.
    this.widgets = null;
  };
}
