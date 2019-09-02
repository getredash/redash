import debug from 'debug';

export const logger = debug('redash:directives');

export const requestAnimationFrame = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function requestAnimationFrameFallback(callback) {
    setTimeout(callback, 10);
  };
