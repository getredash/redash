You can use this folder to add scripts and configurations to customize Redash build and development loop.

## How to customize Webpack

### Configurable parameters

You can override the values of configurable parameters by exporting a `CONFIG` object from the module located at `scripts/config`.

Currently the following parameters are supported:

- **staticPath**: Override the location of Redash static files (default = `/static/`).

#### Example Configuration (`scripts/config.js`):

```javascript
module.exports = {
  staticPath: "my/redash/static/path"
};
```

### Programmatically

For advanced customization, you can provide a script to apply any kind of overrides to the default config as provided by `webpack.config.js`.

The override module must be located under `scripts/webpack/overrides`. It should export a `function` that receives the Webpack configuration object and returns the overridden version.

#### Example Override Script (`scripts/webpack/overrides.js`):

This is an example of an override that enables Webpack stats.

```javascript
function applyOverrides(webpackConfig) {
  return {
    ...webpackConfig,
    stats: {
      children: true,
      modules: true,
      chunkModules: true
    }
  };
}

module.exports = applyOverrides;
```
