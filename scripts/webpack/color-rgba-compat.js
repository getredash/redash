/**
 * CJS/ESM compatibility shim for color-rgba.
 * 
 * Problem: color-rgba@3.0.0 uses ESM `export default function rgba` but is
 * required by CJS packages (color-normalize@1.5.0). With pnpm shamefully-hoist,
 * webpack resolves the hoisted ESM version, returning {default: fn} instead of fn.
 * 
 * This shim is used via webpack resolve.alias to intercept require('color-rgba').
 * It re-exports the default function as module.exports, compatible with both:
 *   - CJS consumers: require('color-rgba') → function
 *   - ESM-aware consumers: require('color-rgba').default → function
 */
'use strict';

// __non_webpack_require__ is NOT processed by webpack - it becomes a real 
// Node.js require at runtime. But since this runs in the browser, we need 
// a different approach.

// Instead, we use the original color-rgba module which webpack will resolve.
// The key: this file is CJS, so webpack wraps the ESM import's namespace.
// We just need to extract .default from the webpack-generated namespace.
var _mod = require(/* webpackIgnore: false */ '../node_modules/.pnpm/color-rgba@3.0.0/node_modules/color-rgba/index.js');
var fn = _mod && _mod.__esModule && _mod.default ? _mod.default : (typeof _mod === 'function' ? _mod : _mod);

module.exports = fn;
module.exports.default = fn;

