/* eslint-disable */
/*
TODO:
1. export module name.
2. publish into its own repo?
3. fix lint errors.
*/
import angular from 'angular';
import jQuery from 'jquery';
import sortable from 'jquery-ui/ui/widgets/sortable';

/*
 jQuery UI Sortable plugin wrapper

 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
 */
angular.module('ui.sortable', [])
  .value('uiSortableConfig', {
    // the default for jquery-ui sortable is "> *", we need to restrict this to
    // ng-repeat items
    // if the user uses
    items: '> [ng-repeat],> [data-ng-repeat],> [x-ng-repeat]',
    cancel: 'input, textarea, button, select, option, .ui-sortable-bypass',
  })
  .directive('uiSortable', [
    'uiSortableConfig', '$timeout', '$log',
    function (uiSortableConfig, $timeout, $log) {
      return {
        require: '?ngModel',
        scope: {
          ngModel: '=',
          uiSortable: '=',
        },
        link(scope, element, attrs, ngModel) {
          let savedNodes;
          element = jQuery(element);

          function combineCallbacks(first, second) {
            const firstIsFunc = typeof first === 'function';
            const secondIsFunc = typeof second === 'function';
            if (firstIsFunc && secondIsFunc) {
              return function () {
                first.apply(this, arguments);
                second.apply(this, arguments);
              };
            } else if (secondIsFunc) {
              return second;
            }
            return first;
          }

          function getSortableWidgetInstance(element) {
            // this is a fix to support jquery-ui prior to v1.11.x
            // otherwise we should be using `element.sortable('instance')`
            const data = element.data('ui-sortable');
            if (data && typeof data === 'object' && data.widgetFullName === 'ui-sortable') {
              return data;
            }
            return null;
          }

          function patchSortableOption(key, value) {
            if (callbacks[key]) {
              if (key === 'stop') {
                // call apply after stop
                value = combineCallbacks(
                  value, () => { scope.$apply(); });

                value = combineCallbacks(value, afterStop);
              }
              // wrap the callback
              value = combineCallbacks(callbacks[key], value);
            } else if (wrappers[key]) {
              value = wrappers[key](value);
            }

            // patch the options that need to have values set
            if (!value && (key === 'items' || key === 'ui-model-items')) {
              value = uiSortableConfig.items;
            }

            return value;
          }

          function patchUISortableOptions(newVal, oldVal, sortableWidgetInstance) {
            function addDummyOptionKey(value, key) {
              if (!(key in opts)) {
                // add the key in the opts object so that
                // the patch function detects and handles it
                opts[key] = null;
              }
            }
            // for this directive to work we have to attach some callbacks
            angular.forEach(callbacks, addDummyOptionKey);

            // only initialize it in case we have to
            // update some options of the sortable
            let optsDiff = null;

            if (oldVal) {
              // reset deleted options to default
              let defaultOptions;
              angular.forEach(oldVal, (oldValue, key) => {
                if (!newVal || !(key in newVal)) {
                  if (key in directiveOpts) {
                    if (key === 'ui-floating') {
                      opts[key] = 'auto';
                    } else {
                      opts[key] = patchSortableOption(key, undefined);
                    }
                    return;
                  }

                  if (!defaultOptions) {
                    defaultOptions = sortable().options;
                  }
                  let defaultValue = defaultOptions[key];
                  defaultValue = patchSortableOption(key, defaultValue);

                  if (!optsDiff) {
                    optsDiff = {};
                  }
                  optsDiff[key] = defaultValue;
                  opts[key] = defaultValue;
                }
              });
            }

            // update changed options
            angular.forEach(newVal, (value, key) => {
              // if it's a custom option of the directive,
              // handle it approprietly
              if (key in directiveOpts) {
                if (key === 'ui-floating' && (value === false || value === true) && sortableWidgetInstance) {
                  sortableWidgetInstance.floating = value;
                }

                opts[key] = patchSortableOption(key, value);
                return;
              }

              value = patchSortableOption(key, value);

              if (!optsDiff) {
                optsDiff = {};
              }
              optsDiff[key] = value;
              opts[key] = value;
            });

            return optsDiff;
          }

          function getPlaceholderElement(element) {
            const placeholder = element.sortable('option', 'placeholder');

            // placeholder.element will be a function if the placeholder, has
            // been created (placeholder will be an object).  If it hasn't
            // been created, either placeholder will be false if no
            // placeholder class was given or placeholder.element will be
            // undefined if a class was given (placeholder will be a string)
            if (placeholder && placeholder.element && typeof placeholder.element === 'function') {
              let result = placeholder.element();
              // workaround for jquery ui 1.9.x,
              // not returning jquery collection
              result = jQuery(result);
              return result;
            }
            return null;
          }

          function getPlaceholderExcludesludes(element, placeholder) {
            // exact match with the placeholder's class attribute to handle
            // the case that multiple connected sortables exist and
            // the placeholder option equals the class of sortable items
            const notCssSelector = opts['ui-model-items'].replace(/[^,]*>/g, '');
            const excludes = element.find(`[class="${placeholder.attr('class')}"]:not(${notCssSelector})`);
            return excludes;
          }

          function hasSortingHelper(element, ui) {
            const helperOption = element.sortable('option', 'helper');
            return helperOption === 'clone' || (typeof helperOption === 'function' && ui.item.sortable.isCustomHelperUsed());
          }

          function getSortingHelper(element, ui, savedNodes) {
            let result = null;
            if (hasSortingHelper(element, ui) &&
                element.sortable('option', 'appendTo') === 'parent') {
              // The .ui-sortable-helper element (that's the default class name)
              // is placed last.
              result = savedNodes.last();
            }
            return result;
          }

          // thanks jquery-ui
          function isFloating(item) {
            return (/left|right/).test(item.css('float')) || (/inline|table-cell/).test(item.css('display'));
          }

          function getElementScope(elementScopes, element) {
            let result = null;
            for (let i = 0; i < elementScopes.length; i++) {
              const x = elementScopes[i];
              if (x.element[0] === element[0]) {
                result = x.scope;
                break;
              }
            }
            return result;
          }

          function afterStop(e, ui) {
            ui.item.sortable._destroy();
          }

          // return the index of ui.item among the items
          // we can't just do ui.item.index() because there it might have siblings
          // which are not items
          function getItemIndex(item) {
            return item.parent()
              .find(opts['ui-model-items'])
              .index(item);
          }

          let opts = {};

          // directive specific options
          let directiveOpts = {
            'ui-floating': undefined,
            'ui-model-items': uiSortableConfig.items,
          };

          let callbacks = {
            receive: null,
            remove: null,
            start: null,
            stop: null,
            update: null,
          };

          let wrappers = {
            helper: null,
          };

          angular.extend(opts, directiveOpts, uiSortableConfig, scope.uiSortable);

          function wireUp() {
            // When we add or remove elements, we need the sortable to 'refresh'
            // so it can find the new/removed elements.
            scope.$watchCollection('ngModel', () => {
              // Timeout to let ng-repeat modify the DOM
              $timeout(() => {
                // ensure that the jquery-ui-sortable widget instance
                // is still bound to the directive's element
                if (!!getSortableWidgetInstance(element)) {
                  element.sortable('refresh');
                }
              }, 0, false);
            });

            callbacks.start = function (e, ui) {
              if (opts['ui-floating'] === 'auto') {
                // since the drag has started, the element will be
                // absolutely positioned, so we check its siblings
                const siblings = ui.item.siblings();
                const sortableWidgetInstance = getSortableWidgetInstance(jQuery(e.target));
                sortableWidgetInstance.floating = isFloating(siblings);
              }

              // Save the starting position of dragged item
              const index = getItemIndex(ui.item);
              ui.item.sortable = {
                model: ngModel.$modelValue[index],
                index,
                source: ui.item.parent(),
                sourceModel: ngModel.$modelValue,
                cancel() {
                  ui.item.sortable._isCanceled = true;
                },
                isCanceled() {
                  return ui.item.sortable._isCanceled;
                },
                isCustomHelperUsed() {
                  return !!ui.item.sortable._isCustomHelperUsed;
                },
                _isCanceled: false,
                _isCustomHelperUsed: ui.item.sortable._isCustomHelperUsed,
                _destroy() {
                  angular.forEach(ui.item.sortable, (value, key) => {
                    ui.item.sortable[key] = undefined;
                  });
                },
              };
            };

            callbacks.activate = function (e, ui) {
              // We need to make a copy of the current element's contents so
              // we can restore it after sortable has messed it up.
              // This is inside activate (instead of start) in order to save
              // both lists when dragging between connected lists.
              savedNodes = element.contents();

              // If this list has a placeholder (the connected lists won't),
              // don't inlcude it in saved nodes.
              const placeholder = getPlaceholderElement(element);
              if (placeholder && placeholder.length) {
                const excludes = getPlaceholderExcludesludes(element, placeholder);
                savedNodes = savedNodes.not(excludes);
              }

              // save the directive's scope so that it is accessible from ui.item.sortable
              const connectedSortables = ui.item.sortable._connectedSortables || [];

              connectedSortables.push({
                element,
                scope,
              });

              ui.item.sortable._connectedSortables = connectedSortables;
            };

            callbacks.update = function (e, ui) {
              // Save current drop position but only if this is not a second
              // update that happens when moving between lists because then
              // the value will be overwritten with the old value
              if (!ui.item.sortable.received) {
                ui.item.sortable.dropindex = getItemIndex(ui.item);
                const droptarget = ui.item.parent();
                ui.item.sortable.droptarget = droptarget;

                const droptargetScope = getElementScope(ui.item.sortable._connectedSortables, droptarget);
                ui.item.sortable.droptargetModel = droptargetScope.ngModel;

                // Cancel the sort (let ng-repeat do the sort for us)
                // Don't cancel if this is the received list because it has
                // already been canceled in the other list, and trying to cancel
                // here will mess up the DOM.
                element.sortable('cancel');
              }

              // Put the nodes back exactly the way they started (this is very
              // important because ng-repeat uses comment elements to delineate
              // the start and stop of repeat sections and sortable doesn't
              // respect their order (even if we cancel, the order of the
              // comments are still messed up).
              const sortingHelper = !ui.item.sortable.received && getSortingHelper(element, ui, savedNodes);
              if (sortingHelper && sortingHelper.length) {
                // Restore all the savedNodes except from the sorting helper element.
                // That way it will be garbage collected.
                savedNodes = savedNodes.not(sortingHelper);
              }
              savedNodes.appendTo(element);

              // If this is the target connected list then
              // it's safe to clear the restored nodes since:
              // update is currently running and
              // stop is not called for the target list.
              if (ui.item.sortable.received) {
                savedNodes = null;
              }

              // If received is true (an item was dropped in from another list)
              // then we add the new item to this list otherwise wait until the
              // stop event where we will know if it was a sort or item was
              // moved here from another list
              if (ui.item.sortable.received && !ui.item.sortable.isCanceled()) {
                scope.$apply(() => {
                  ngModel.$modelValue.splice(ui.item.sortable.dropindex, 0,
                                             ui.item.sortable.moved);
                });
              }
            };

            callbacks.stop = function (e, ui) {
              // If the received flag hasn't be set on the item, this is a
              // normal sort, if dropindex is set, the item was moved, so move
              // the items in the list.
              if (!ui.item.sortable.received &&
                 ('dropindex' in ui.item.sortable) &&
                 !ui.item.sortable.isCanceled()) {
                scope.$apply(() => {
                  ngModel.$modelValue.splice(
                    ui.item.sortable.dropindex, 0,
                    ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0]);
                });
              } else {
                // if the item was not moved, then restore the elements
                // so that the ngRepeat's comment are correct.
                if ((!('dropindex' in ui.item.sortable) || ui.item.sortable.isCanceled()) &&
                    !angular.equals(element.contents(), savedNodes)) {
                  const sortingHelper = getSortingHelper(element, ui, savedNodes);
                  if (sortingHelper && sortingHelper.length) {
                    // Restore all the savedNodes except from the sorting helper element.
                    // That way it will be garbage collected.
                    savedNodes = savedNodes.not(sortingHelper);
                  }
                  savedNodes.appendTo(element);
                }
              }

              // It's now safe to clear the savedNodes
              // since stop is the last callback.
              savedNodes = null;
            };

            callbacks.receive = function (e, ui) {
              // An item was dropped here from another list, set a flag on the
              // item.
              ui.item.sortable.received = true;
            };

            callbacks.remove = function (e, ui) {
              // Workaround for a problem observed in nested connected lists.
              // There should be an 'update' event before 'remove' when moving
              // elements. If the event did not fire, cancel sorting.
              if (!('dropindex' in ui.item.sortable)) {
                element.sortable('cancel');
                ui.item.sortable.cancel();
              }

              // Remove the item from this list's model and copy data into item,
              // so the next list can retrive it
              if (!ui.item.sortable.isCanceled()) {
                scope.$apply(() => {
                  ui.item.sortable.moved = ngModel.$modelValue.splice(
                    ui.item.sortable.index, 1)[0];
                });
              }
            };

            wrappers.helper = function (inner) {
              if (inner && typeof inner === 'function') {
                return function (e, item) {
                  const oldItemSortable = item.sortable;
                  const index = getItemIndex(item);
                  item.sortable = {
                    model: ngModel.$modelValue[index],
                    index,
                    source: item.parent(),
                    sourceModel: ngModel.$modelValue,
                    _restore() {
                      angular.forEach(item.sortable, (value, key) => {
                        item.sortable[key] = undefined;
                      });

                      item.sortable = oldItemSortable;
                    },
                  };

                  const innerResult = inner.apply(this, arguments);
                  item.sortable._restore();
                  item.sortable._isCustomHelperUsed = item !== innerResult;
                  return innerResult;
                };
              }
              return inner;
            };

            scope.$watchCollection('uiSortable', (newVal, oldVal) => {
              // ensure that the jquery-ui-sortable widget instance
              // is still bound to the directive's element
              const sortableWidgetInstance = getSortableWidgetInstance(element);
              if (!!sortableWidgetInstance) {
                const optsDiff = patchUISortableOptions(newVal, oldVal, sortableWidgetInstance);

                if (optsDiff) {
                  element.sortable('option', optsDiff);
                }
              }
            }, true);

            patchUISortableOptions(opts);
          }

          function init() {
            if (ngModel) {
              wireUp();
            } else {
              $log.info('ui.sortable: ngModel not provided!', element);
            }

            // Create sortable
            element.sortable(opts);
          }

          function initIfEnabled() {
            if (scope.uiSortable && scope.uiSortable.disabled) {
              return false;
            }

            init();

            // Stop Watcher
            initIfEnabled.cancelWatcher();
            initIfEnabled.cancelWatcher = angular.noop;

            return true;
          }

          initIfEnabled.cancelWatcher = angular.noop;

          if (!initIfEnabled()) {
            initIfEnabled.cancelWatcher = scope.$watch('uiSortable.disabled', initIfEnabled);
          }
        },
      };
    },
  ]);
