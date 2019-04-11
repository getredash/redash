import $ from 'jquery';
import _ from 'lodash';
import './gridstack';
import './gridstack.less';

function toggleAutoHeightClass($element, isEnabled) {
  const className = 'widget-auto-height-enabled';
  if (isEnabled) {
    $element.addClass(className);
  } else {
    $element.removeClass(className);
  }
}

function computeAutoHeight($element, grid, node, minHeight, maxHeight) {
  const wrapper = $element[0];
  const element = wrapper.querySelector('.scrollbox, .spinner-container');

  let resultHeight = _.isObject(node) ? node.height : 1;
  if (element) {
    const childrenBounds = _.chain(element.children)
      .map((child) => {
        const bounds = child.getBoundingClientRect();
        const style = window.getComputedStyle(child);
        return {
          top: bounds.top - parseFloat(style.marginTop),
          bottom: bounds.bottom + parseFloat(style.marginBottom),
        };
      })
      .reduce((result, bounds) => ({
        top: Math.min(result.top, bounds.top),
        bottom: Math.max(result.bottom, bounds.bottom),
      }))
      .value() || { top: 0, bottom: 0 };

    // Height of controls outside visualization area
    const bodyWrapper = wrapper.querySelector('.body-container');
    if (bodyWrapper) {
      const elementStyle = window.getComputedStyle(element);
      const controlsHeight = _.chain(bodyWrapper.children)
        .filter(n => n !== element)
        .reduce((result, n) => {
          const b = n.getBoundingClientRect();
          return result + (b.bottom - b.top);
        }, 0)
        .value();

      const additionalHeight = grid.opts.verticalMargin +
        // include container paddings too
        parseFloat(elementStyle.paddingTop) + parseFloat(elementStyle.paddingBottom) +
        // add few pixels for scrollbar (if visible)
        (element.scrollWidth > element.offsetWidth ? 16 : 0);

      const contentsHeight = childrenBounds.bottom - childrenBounds.top;

      const cellHeight = grid.cellHeight() + grid.opts.verticalMargin;
      resultHeight = Math.ceil(Math.round(controlsHeight + contentsHeight + additionalHeight) / cellHeight);
    }
  }

  // minHeight <= resultHeight <= maxHeight
  return Math.min(Math.max(minHeight, resultHeight), maxHeight);
}

function gridstack($parse, dashboardGridOptions) {
  return {
    restrict: 'A',
    replace: false,
    scope: {
      editing: '=',
      batchUpdate: '=', // set by directive - for using in wrapper components
      onLayoutChanged: '=',
      isOneColumnMode: '=',
    },
    controller() {
      this.$el = null;

      this.resizingWidget = null;
      this.draggingWidget = null;

      this.grid = () => (this.$el ? this.$el.data('gridstack') : null);

      this._updateStyles = () => {
        const grid = this.grid();
        if (grid) {
          // compute real grid height; `gridstack` sometimes uses only "dirty"
          // items and computes wrong height
          const gridHeight = _.chain(grid.grid.nodes)
            .map(node => node.y + node.height)
            .max()
            .value();
          // `_updateStyles` is internal, but grid sometimes "forgets"
          // to rebuild stylesheet, so we need to force it
          if (_.isObject(grid._styles)) {
            grid._styles._max = 0; // reset size cache
          }
          grid._updateStyles(gridHeight + 10);
        }
      };

      this.addWidget = ($element, item, itemId) => {
        const grid = this.grid();
        if (grid) {
          grid.addWidget(
            $element,
            item.col, item.row, item.sizeX, item.sizeY,
            false, // auto position
            item.minSizeX, item.maxSizeX, item.minSizeY, item.maxSizeY,
            itemId,
          );
          this._updateStyles();
        }
      };

      this.updateWidget = ($element, item) => {
        this.update((grid) => {
          grid.update($element, item.col, item.row, item.sizeX, item.sizeY);
          grid.minWidth($element, item.minSizeX);
          grid.maxWidth($element, item.maxSizeX);
          grid.minHeight($element, item.minSizeY);
          grid.maxHeight($element, item.maxSizeY);
        });
      };

      this.removeWidget = ($element) => {
        const grid = this.grid();
        if (grid) {
          grid.removeWidget($element, false);
          this._updateStyles();
        }
      };

      this.getNodeByElement = (element) => {
        const grid = this.grid();
        if (grid && grid.grid) {
          // This method seems to be internal
          return grid.grid.getNodeDataByDOMEl($(element));
        }
      };

      this.setWidgetId = ($element, id) => {
        // `gridstack` has no API method to change node id; but since it's not used
        // by library, we can just update grid and DOM node
        const node = this.getNodeByElement($element);
        if (node) {
          node.id = id;
          $element.attr('data-gs-id', _.isUndefined(id) ? null : id);
        }
      };

      this.setEditing = (value) => {
        const grid = this.grid();
        if (grid) {
          if (value) {
            grid.enable();
          } else {
            grid.disable();
          }
        }
      };

      this.update = (callback) => {
        const grid = this.grid();
        if (grid) {
          grid.batchUpdate();
          try {
            if (_.isFunction(callback)) {
              callback(grid);
            }
          } finally {
            grid.commit();
            this._updateStyles();
          }
        }
      };
    },
    link: ($scope, $element, $attr, controller) => {
      const isOneColumnModeAssignable = _.isFunction($parse($attr.onLayoutChanged).assign);
      let enablePolling = true;

      $element.addClass('grid-stack');
      $element.gridstack({
        auto: false,
        verticalMargin: dashboardGridOptions.margins,
        // real row height will be `cellHeight` + `verticalMargin`
        cellHeight: dashboardGridOptions.rowHeight - dashboardGridOptions.margins,
        width: dashboardGridOptions.columns, // columns
        height: 0, // max rows (0 for unlimited)
        animate: true,
        float: false,
        minWidth: dashboardGridOptions.mobileBreakPoint,
        resizable: {
          handles: 'e, se, s, sw, w',
          start: (event, ui) => {
            controller.resizingWidget = ui.element;
            $(ui.element).trigger(
              'gridstack.resize-start',
              controller.getNodeByElement(ui.element),
            );
          },
          stop: (event, ui) => {
            controller.resizingWidget = null;
            $(ui.element).trigger(
              'gridstack.resize-end',
              controller.getNodeByElement(ui.element),
            );
            controller.update();
          },
        },
        draggable: {
          start: (event, ui) => {
            controller.draggingWidget = ui.helper;
            $(ui.helper).trigger(
              'gridstack.drag-start',
              controller.getNodeByElement(ui.helper),
            );
          },
          stop: (event, ui) => {
            controller.draggingWidget = null;
            $(ui.helper).trigger(
              'gridstack.drag-end',
              controller.getNodeByElement(ui.helper),
            );
            controller.update();
          },
        },
      });
      controller.$el = $element;

      // `change` events sometimes fire too frequently (for example,
      // on initial rendering when all widgets add themselves to grid, grid
      // will fire `change` event will _all_ items available at that moment).
      // Collect changed items, and then delegate event with some delay
      let changedNodes = {};
      const triggerChange = _.debounce(() => {
        _.each(changedNodes, (node) => {
          if (node.el) {
            $(node.el).trigger('gridstack.changed', node);
          }
        });
        if ($scope.onLayoutChanged) {
          $scope.onLayoutChanged();
        }
        changedNodes = {};
      });

      $element.on('change', (event, nodes) => {
        nodes = _.isArray(nodes) ? nodes : [];
        _.each(nodes, (node) => {
          changedNodes[node.id] = node;
        });
        triggerChange();
      });

      $scope.$watch('editing', (value) => {
        controller.setEditing(!!value);
      });

      $scope.$on('$destroy', () => {
        enablePolling = false;
        controller.$el = null;
      });

      // `gridstack` does not provide API to detect when one-column mode changes.
      // Just watch `$element` for specific class
      function updateOneColumnMode() {
        const grid = controller.grid();
        if (grid) {
          const isOneColumnMode = $element.hasClass(grid.opts.oneColumnModeClass);
          if ($scope.isOneColumnMode !== isOneColumnMode) {
            $scope.isOneColumnMode = isOneColumnMode;
            $scope.$applyAsync();
          }
        }

        if (enablePolling) {
          setTimeout(updateOneColumnMode, 150);
        }
      }

      // Start polling only if we can update scope binding; otherwise it
      // will just waisting CPU time (example: public dashboards don't need it)
      if (isOneColumnModeAssignable) {
        updateOneColumnMode();
      }
    },
  };
}

function gridstackItem($timeout) {
  return {
    restrict: 'A',
    replace: false,
    require: '^gridstack',
    scope: {
      gridstackItem: '=',
      gridstackItemId: '@',
    },
    link: ($scope, $element, $attr, controller) => {
      let enablePolling = true;
      let heightBeforeResize = null;

      controller.addWidget($element, $scope.gridstackItem, $scope.gridstackItemId);

      // these events are triggered only on user interaction
      $element.on('gridstack.resize-start', () => {
        const node = controller.getNodeByElement($element);
        heightBeforeResize = _.isObject(node) ? node.height : null;
      });
      $element.on('gridstack.resize-end', (event, node) => {
        const item = $scope.gridstackItem;
        if (
          _.isObject(node) && _.isObject(item) &&
          (node.height !== heightBeforeResize) &&
          (heightBeforeResize !== null)
        ) {
          item.autoHeight = false;
          toggleAutoHeightClass($element, item.autoHeight);
          $scope.$applyAsync();
        }
      });

      $element.on('gridstack.changed', (event, node) => {
        const item = $scope.gridstackItem;
        if (_.isObject(node) && _.isObject(item)) {
          let dirty = false;
          if (node.x !== item.col) {
            item.col = node.x;
            dirty = true;
          }
          if (node.y !== item.row) {
            item.row = node.y;
            dirty = true;
          }
          if (node.width !== item.sizeX) {
            item.sizeX = node.width;
            dirty = true;
          }
          if (node.height !== item.sizeY) {
            item.sizeY = node.height;
            dirty = true;
          }
          if (dirty) {
            $scope.$applyAsync();
          }
        }
      });

      $scope.$watch('gridstackItem.autoHeight', () => {
        const item = $scope.gridstackItem;
        if (_.isObject(item)) {
          toggleAutoHeightClass($element, item.autoHeight);
        } else {
          toggleAutoHeightClass($element, false);
        }
      });

      $scope.$watch('gridstackItemId', () => {
        controller.setWidgetId($element, $scope.gridstackItemId);
      });

      $scope.$on('$destroy', () => {
        enablePolling = false;
        $timeout(() => {
          controller.removeWidget($element);
        });
      });

      function update() {
        if (!controller.resizingWidget && !controller.draggingWidget) {
          const item = $scope.gridstackItem;
          const grid = controller.grid();
          if (grid && _.isObject(item) && item.autoHeight) {
            const sizeY = computeAutoHeight(
              $element, grid, controller.getNodeByElement($element),
              item.minSizeY, item.maxSizeY,
            );
            if (sizeY !== item.sizeY) {
              item.sizeY = sizeY;
              controller.updateWidget($element, { sizeY });
              $scope.$applyAsync();
            }
          }
        }
        if (enablePolling) {
          setTimeout(update, 150);
        }
      }

      update();
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('gridstack', gridstack);
  ngModule.directive('gridstackItem', gridstackItem);
}

init.init = true;
