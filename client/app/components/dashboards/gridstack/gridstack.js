import $ from 'jquery';
import _ from 'underscore';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'jquery-ui/ui/widgets/resizable';
import 'gridstack/dist/gridstack.css';

// eslint-disable-next-line import/first
import gridstack from 'gridstack';

function sequence(...fns) {
  fns = _.filter(fns, _.isFunction);
  if (fns.length > 0) {
    return function sequenceWrapper(...args) {
      for (let i = 0; i < fns.length; i += 1) {
        fns[i].apply(this, args);
      }
    };
  }
  return _.noop;
}

// eslint-disable-next-line import/prefer-default-export
function JQueryUIGridStackDragDropPlugin(grid) {
  gridstack.GridStackDragDropPlugin.call(this, grid);
}

gridstack.GridStackDragDropPlugin.registerPlugin(JQueryUIGridStackDragDropPlugin);

JQueryUIGridStackDragDropPlugin.prototype = Object.create(gridstack.GridStackDragDropPlugin.prototype);
JQueryUIGridStackDragDropPlugin.prototype.constructor = JQueryUIGridStackDragDropPlugin;

JQueryUIGridStackDragDropPlugin.prototype.resizable = function resizable(el, opts, key, value) {
  el = $(el);
  if (opts === 'disable' || opts === 'enable') {
    el.resizable(opts);
  } else if (opts === 'option') {
    el.resizable(opts, key, value);
  } else {
    el.resizable(_.extend({}, this.grid.opts.resizable, {
      // run user-defined callback before internal one
      start: sequence(this.grid.opts.resizable.start, opts.start),
      // this and next - run user-defined callback after internal one
      stop: sequence(opts.stop, this.grid.opts.resizable.stop),
      resize: sequence(opts.resize, this.grid.opts.resizable.resize),
    }));
  }
  return this;
};

JQueryUIGridStackDragDropPlugin.prototype.draggable = function draggable(el, opts) {
  el = $(el);
  if (opts === 'disable' || opts === 'enable') {
    el.draggable(opts);
  } else {
    el.draggable(_.extend({}, this.grid.opts.draggable, {
      containment: this.grid.opts.isNested ? this.grid.container.parent() : null,
      // run user-defined callback before internal one
      start: sequence(this.grid.opts.draggable.start, opts.start),
      // this and next - run user-defined callback after internal one
      stop: sequence(opts.stop, this.grid.opts.draggable.stop),
      drag: sequence(opts.drag, this.grid.opts.draggable.drag),
    }));
  }
  return this;
};

JQueryUIGridStackDragDropPlugin.prototype.droppable = function droppable(el, opts) {
  el = $(el);
  if (opts === 'disable' || opts === 'enable') {
    el.droppable(opts);
  } else {
    el.droppable({
      accept: opts.accept,
    });
  }
  return this;
};

JQueryUIGridStackDragDropPlugin.prototype.isDroppable = function isDroppable(el) {
  return Boolean($(el).data('droppable'));
};

JQueryUIGridStackDragDropPlugin.prototype.on = function on(el, eventName, callback) {
  $(el).on(eventName, callback);
  return this;
};
