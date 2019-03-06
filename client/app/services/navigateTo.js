import { isString } from 'lodash';
import { $location, $rootScope } from '@/services/ng';

export default function navigateTo(url, replace = false) {
  if (isString(url)) {
    $location.url(url);
    if (replace) {
      $location.replace();
    }
    $rootScope.$applyAsync();
  }
}

function cloneEvent(event) {
  try {
    return new event.constructor(event.type, event);
  } catch (e) {
    // fallback for IE; also works in modern browsers, but is deprecated
    const result = document.createEvent(event.constructor.name);
    if (result.initMouseEvent) {
      result.initMouseEvent(
        event.type,
        event.bubbles,
        event.cancelable,
        window,
        0,
        event.screenX || 0,
        event.screenY || 0,
        event.clientX || 0,
        event.clientY || 0,
        event.ctrlKey || false,
        event.altKey || false,
        event.shiftKey || false,
        event.metaKey || false,
        event.button || 0,
        event.relatedTarget || null,
      );
    } else {
      result.initEvent(
        event.type,
        event.bubbles,
        event.cancelable,
      );
    }
    return result;
  }
}

export function handleNavigationEvent(event, url) {
  // cancel this event - we're going to forward it to <a> tag to keep
  // native browser's behavior when modifier keys pressed (ctrl/shift/meta)
  event.preventDefault();
  event.stopPropagation();

  // create <a> tag - need to append it to <body> to get angular-router working
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.style.position = 'absolute';
  link.style.left = '-100px';
  link.style.top = '-100px';
  document.body.appendChild(link);
  // we cannot re-dispatch the same event, so create a copy
  link.dispatchEvent(cloneEvent(event.nativeEvent));

  // cleanup
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
}
