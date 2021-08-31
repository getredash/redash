/* eslint-disable */

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackBuildNotifierPlugin = require("webpack-build-notifier");
const ManifestPlugin = require("webpack-manifest-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const LessPluginAutoPrefix = require("less-plugin-autoprefix");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const path = require("path");

function optionalRequire(module, defaultReturn = undefined) {
  try {
    require.resolve(module);
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND") {
      // Module was not found, return default value if any
      return defaultReturn;
    }
    throw e;
  }
  return require(module);
}

// Load optionally configuration object (see scripts/README)
const CONFIG = optionalRequire("./scripts/config", {});

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;
const isHotReloadingEnabled =
  isDevelopment && process.env.HOT_RELOAD === "true";

const redashBackend = process.env.REDASH_BACKEND || "http://localhost:5000";
const baseHref = CONFIG.baseHref || "/";
const staticPath = CONFIG.staticPath || "/static/";
const htmlTitle = CONFIG.title || "Redash";

const basePath = path.join(__dirname);
const appPath = path.join(__dirname, "src", "app");

const extensionsRelativePath =
  process.env.EXTENSIONS_DIRECTORY || path.join("src", "app", "extensions");
const extensionPath = path.join(__dirname, extensionsRelativePath);

// Function to apply configuration overrides (see scripts/README)
function maybeApplyOverrides(config) {
  const overridesLocation =
    process.env.REDASH_WEBPACK_OVERRIDES || "./scripts/webpack/overrides";
  const applyOverrides = optionalRequire(overridesLocation);
  if (!applyOverrides) {
    return config;
  }
  console.info("Custom overrides found. Applying them...");
  const newConfig = applyOverrides(config);
  console.info("Custom overrides applied successfully.");
  return newConfig;
}

const config = {
  mode: isProduction ? "production" : "development",
  entry: {
    app: [
      path.join(appPath, "index.js"),
      path.join(appPath, "assets/less/main.less"),
        path.join(appPath, "assets/less/ant.less")
    ],
    server: [path.join(appPath, "assets/less/server.less")]
  },
  output: {
    path: path.join(basePath, "./dist"),
    filename: isProduction ? "[name].[chunkhash].js" : "[name].js",
    publicPath: staticPath
  },
  resolve: {
    symlinks: false,
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      "@": appPath,
      extensions: extensionPath
    }
  },
  plugins: [
    new WebpackBuildNotifierPlugin({ title: "Redash" }),
    // bundle only default `moment` locale (`en`)
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en/),
    new HtmlWebpackPlugin({
      template: path.join(appPath, "index.html"),
      filename: "index.html",
      excludeChunks: ["server"],
      release: process.env.BUILD_VERSION || "dev",
      staticPath,
      baseHref,
      title: htmlTitle
    }),
    new HtmlWebpackPlugin({
      template: path.join(appPath, "multi_org.html"),
      filename: "multi_org.html",
      excludeChunks: ["server"]
    }),
    isProduction &&
      new MiniCssExtractPlugin({
        filename: "[name].[chunkhash].css"
      }),
    new ManifestPlugin({
      fileName: "asset-manifest.json",
      publicPath: ""
    }),
    new CopyWebpackPlugin([
      { from: "src/app/assets/robots.txt" },
      { from: "src/app/unsupported.html" },
      { from: "src/app/unsupportedRedirect.js" },
      { from: "src/app/assets/css/*.css", to: "styles/", flatten: true },
      { from: "src/app/assets/fonts", to: "fonts/" }
    ]),
    isHotReloadingEnabled && new ReactRefreshWebpackPlugin({ overlay: false })
  ].filter(Boolean),
  optimization: {
    splitChunks: {
      chunks: chunk => {
        return chunk.name != "server";
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve("babel-loader"),
            options: {
              plugins: [
                isHotReloadingEnabled && require.resolve("react-refresh/babel")
              ].filter(Boolean)
            }
          },
          require.resolve("eslint-loader")
        ]
      },
      {
        test: /\.html$/,
        exclude: [/node_modules/, /index\.html/, /multi_org\.html/],
        use: [
          {
            loader: "raw-loader"
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: isProduction ? MiniCssExtractPlugin.loader : "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              minimize: process.env.NODE_ENV === "production"
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: isProduction ? MiniCssExtractPlugin.loader : "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              minimize: isProduction
            }
          },
          {
            loader: "less-loader",
            options: {
              plugins: [
                new LessPluginAutoPrefix({ browsers: ["last 3 versions"] })
              ],
              javascriptEnabled: true
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              context: path.resolve(appPath, "./assets/images/"),
              outputPath: "images/",
              name: "[path][name].[ext]"
            }
          }
        ]
      },
      {
        test: /\.geo\.json$/,
        type: "javascript/auto",
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "data/",
              name: "[hash:7].[name].[ext]"
            }
          }
        ]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 10000,
              name: "fonts/[name].[hash:7].[ext]"
            }
          }
        ]
      }
    ]
  },
  devtool: isProduction ? "source-map" : "cheap-eval-module-source-map",
  stats: {
    children: false,
    modules: false,
    chunkModules: false
  },
  watchOptions: {
    ignored: /\.sw.$/
  },
  devServer: {
    inline: true,
    index: "/static/index.html",
    historyApiFallback: {
      index: "/static/index.html",
      rewrites: [{ from: /./, to: "/static/index.html" }]
    },
    contentBase: false,
    publicPath: staticPath,
    proxy: [
      {
        context: [
          "/login",
          "/logout",
          "/invite",
          "/setup",
          "/status.json",
          "/api",
          "/oauth"
        ],
        target: redashBackend + "/",
        changeOrigin: false,
        secure: false
      },
      {
        context: path => {
          // CSS/JS for server-rendered pages should be served from backend
          return /^\/static\/[a-z]+\.[0-9a-fA-F]+\.(css|js)$/.test(path);
        },
        target: redashBackend + "/",
        changeOrigin: true,
        secure: false
      }
    ],
    stats: {
      modules: false,
      chunkModules: false
    },
    hot: isHotReloadingEnabled
  },
  performance: {
    hints: false
  }
};

if (process.env.DEV_SERVER_HOST) {
  config.devServer.host = process.env.DEV_SERVER_HOST;
}

module.exports = maybeApplyOverrides(config);
