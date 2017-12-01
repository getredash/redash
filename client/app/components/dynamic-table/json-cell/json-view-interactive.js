import { isFunction, isArray, isObject, isString, isNumber, each, keys } from 'underscore';
import $ from 'jquery';
import './json-view-interactive.less';

function getCountComment(count) {
  return ' // ' + count + ' ' + (count === 1 ? 'item' : 'items');
}

function initToggle(toggle, toggleBlockFn) {
  if (isFunction(toggleBlockFn)) {
    let visible = false;
    const icon = $('<i>').addClass('fa fa-caret-right').appendTo(toggle.empty());
    toggleBlockFn(visible);
    toggle.on('click', () => {
      visible = !visible;
      icon.toggleClass('fa-caret-right fa-caret-down');
      toggleBlockFn(visible);
    });
  } else {
    toggle.addClass('hidden');
  }
}

function createRenderNestedBlock(block, ellipsis, values, renderKeys) {
  return (show) => {
    if (show) {
      ellipsis.addClass('hidden');
      block.removeClass('hidden').empty();

      each(values, (val, key) => {
        const nestedBlock = $('<span>').addClass('jvi-item').appendTo(block);

        const toggle = $('<span>').addClass('jvi-toggle').appendTo(nestedBlock);

        if (renderKeys) {
          const keyWrapper = $('<span>').addClass('jvi-object-key').appendTo(nestedBlock);
          // eslint-disable-next-line no-use-before-define
          renderString(keyWrapper, key);
          $('<span>').addClass('jvi-punctuation').text(': ').appendTo(nestedBlock);
        }
        // eslint-disable-next-line no-use-before-define
        const toggleBlockFn = renderValue(nestedBlock, val, true);
        initToggle(toggle, toggleBlockFn);
      });
    } else {
      block.addClass('hidden').empty();
      ellipsis.removeClass('hidden');
    }
  };
}

function renderComma($element) {
  return $('<span>').addClass('jvi-punctuation').text(',').appendTo($element);
}

function renderEllipsis($element) {
  const result = $('<span>')
    .addClass('jvi-punctuation jvi-ellipsis')
    .html('&hellip;')
    .appendTo($element)
    .on('click', () => {
      result.parents('.jvi-item').eq(0).find('.jvi-toggle').trigger('click');
    });
  return result;
}

function renderPrimitive($element, value, comma) {
  $('<span>').addClass('jvi-value jvi-primitive').text('' + value).appendTo($element);
  if (comma) {
    renderComma($element);
  }
  return null;
}

function renderString($element, value, comma) {
  $('<span>').addClass('jvi-punctuation jvi-string').text('"').appendTo($element);
  $('<span>').addClass('jvi-value jvi-string').text(value).appendTo($element);
  $('<span>').addClass('jvi-punctuation jvi-string').text('"').appendTo($element);
  if (comma) {
    renderComma($element);
  }
  return null;
}

function renderArray($element, values, comma) {
  const count = values.length;

  let result = null;

  $('<span>').addClass('jvi-punctuation').text('[').appendTo($element);
  if (count > 0) {
    const ellipsis = renderEllipsis($element);
    const block = $('<span>').addClass('jvi-block hidden').appendTo($element);
    result = createRenderNestedBlock(block, ellipsis, values, false);
  }
  $('<span>').addClass('jvi-punctuation').text(']').appendTo($element);

  if (comma) {
    renderComma($element);
  }

  if (count > 0) {
    const comment = $('<span>').addClass('jvi-comment').text(getCountComment(count))
      .appendTo($element);
    const prevResult = result;
    result = (show) => {
      if (show) {
        comment.addClass('hidden');
      } else {
        comment.removeClass('hidden');
      }
      if (prevResult) {
        prevResult(show);
      }
    };
  }

  return result;
}

function renderObject($element, value, comma) {
  const count = keys(value).length;

  let result = null;

  $('<span>').addClass('jvi-punctuation').text('{').appendTo($element);
  if (count > 0) {
    const ellipsis = renderEllipsis($element);
    const block = $('<span>').addClass('jvi-block hidden').appendTo($element);
    result = createRenderNestedBlock(block, ellipsis, value, true);
  }
  $('<span>').addClass('jvi-punctuation').text('}').appendTo($element);

  if (comma) {
    renderComma($element);
  }

  if (count > 0) {
    const comment = $('<span>').addClass('jvi-comment').text(getCountComment(count))
      .appendTo($element);
    const prevResult = result;
    result = (show) => {
      if (show) {
        comment.addClass('hidden');
      } else {
        comment.removeClass('hidden');
      }
      if (prevResult) {
        prevResult(show);
      }
    };
  }

  return result;
}

function renderValue($element, value, comma) {
  $element = $('<span>').appendTo($element);
  if (
    (value === null) || (value === false) || (value === true) ||
    (isNumber(value) && isFinite(value))
  ) {
    return renderPrimitive($element, value, comma);
  } else if (isString(value)) {
    return renderString($element, value, comma);
  } else if (isArray(value)) {
    return renderArray($element, value, comma);
  } else if (isObject(value)) {
    return renderObject($element, value, comma);
  }
}

export default function renderJsonView(container, value) {
  if (container instanceof $) {
    const block = $('<span>').addClass('jvi-item').appendTo(container);
    const toggle = $('<span>').addClass('jvi-toggle').appendTo(block);
    const toggleBlockFn = renderValue(block, value);
    initToggle(toggle, toggleBlockFn);
  }
}
