module.exports = api => {
  // This caches the Babel config by environment.
  api.cache.using(() => process.env.NODE_ENV);
  return {
    sourceMaps: true,
    sourceType: 'module',
    retainLines: true,
    presets: [
      [
        "@babel/preset-env",
        {
          exclude: [
            "@babel/plugin-transform-async-to-generator",
            "@babel/plugin-transform-arrow-functions"
          ],
          useBuiltIns: "usage",
          corejs: { version: 3, proposals: true }
        }
      ],
      "@babel/preset-react",
      "@babel/preset-typescript"
    ],
    plugins: [
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-transform-object-assign",
      [
        "babel-plugin-transform-builtin-extend",
        {
          globals: ["Error"]
        }
      ],
      !api.env("production") && "react-refresh/babel"
    ].filter(Boolean)
  };
};
