/* eslint-disable */

const fs = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const ManifestPlugin = require('webpack-manifest-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LessPluginAutoPrefix = require('less-plugin-autoprefix');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');

const redashBackend = process.env.REDASH_BACKEND || 'http://localhost:5000';

const basePath = fs.realpathSync(path.join(__dirname, 'client'));
const appPath = fs.realpathSync(path.join(__dirname, 'client', 'app'));

const config = {
  entry: {
    app: [
      './client/app/index.js',
      './client/app/assets/less/main.less',
    ],
    server: [
      './client/app/assets/less/server.less',
    ],
  },
  output: {
    path: path.join(basePath, './dist'),
    filename: '[name].js',
    publicPath: '/static/'
  },
  resolve: {
    alias: {
      '@': appPath,
      // Currently `lodash` is used only by `gridstack.js`, but it can work
      // with `underscore` as well, so set an alias to avoid bundling both `lodash` and
      // `underscore`. When adding new libraries, check if they can work
      // with `underscore`, otherwise remove this line
      'lodash': 'underscore',
    }
  },
  plugins: [
    new WebpackBuildNotifierPlugin({title: 'Redash'}),
    new webpack.DefinePlugin({
      ON_TEST: process.env.NODE_ENV === 'test'
    }),
    // Enforce angular to use jQuery instead of jqLite
    new webpack.ProvidePlugin({'window.jQuery': 'jquery'}),
    // bundle only default `moment` locale (`en`)
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en/),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: function (module, count) {
        // any required modules inside node_modules are extracted to vendor
        return (
          module.resource &&
          /\.js$/.test(module.resource) &&
          module.resource.indexOf(
            path.join(__dirname, './node_modules')
          ) === 0
        )
      }
    }),
    // extract webpack runtime and module manifest to its own file in order to
    // prevent vendor hash from being updated whenever app bundle is updated
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      chunks: ['vendor']
    }),
    new HtmlWebpackPlugin({
      template: './client/app/index.html',
      filename: 'index.html',
      excludeChunks: ['server'],
    }),
    new HtmlWebpackPlugin({
      template: './client/app/multi_org.html',
      filename: 'multi_org.html',
      excludeChunks: ['server'],
    }),
    new ExtractTextPlugin({
      filename: '[name].[chunkhash].css',
    }),
    new ManifestPlugin({
      fileName: 'asset-manifest.json'
    }),
    new CopyWebpackPlugin([
      { from: 'client/app/assets/robots.txt' },
      { from: 'client/app/assets/css/login.css', to: 'styles/login.css' },
      { from: 'node_modules/jquery/dist/jquery.min.js', to: 'js/jquery.min.js' },
    ])
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader']
      },
      {
        test: /\.html$/,
        exclude: [/node_modules/, /index\.html/],
        use: [{
          loader: 'raw-loader'
        }]
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract([{
          loader: 'css-loader',
          options: {
            minimize: process.env.NODE_ENV === 'production'
          }
        }])
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract([
          {
            loader: 'css-loader',
            options: {
              minimize: process.env.NODE_ENV === 'production'
            }
          }, {
            loader: 'less-loader',
            options: {
              plugins: [
                new LessPluginAutoPrefix({browsers: ['last 3 versions']})
              ]
            }
          }
        ])
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            context: path.resolve(appPath, './assets/images/'),
            outputPath: 'images/',
            name: '[path][name].[ext]',
          }
        }]
      },
      {
        test: /\.geo\.json$/,
        use: [{
          loader: 'file-loader',
          options: {
            outputPath: 'data/',
            name: '[hash:7].[name].[ext]',
          }
        }]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'fonts/[name].[hash:7].[ext]'
          }
        }]
      }
    ]
  },
  devtool: 'cheap-eval-module-source-map',
  stats: {
    modules: false,
    chunkModules: false,
  },
  watchOptions: {
    ignored: /\.sw.$/,
  },
  devServer: {
    inline: true,
    index: '/static/index.html',
    historyApiFallback: {
      index: '/static/index.html',
      rewrites: [{from: /./, to: '/static/index.html'}],
    },
    contentBase: false,
    publicPath: '/static/',
    proxy: [
      {
        context: ['/login', '/logout', '/invite', '/setup', '/status.json', '/api', '/oauth'],
        target: redashBackend + '/',
        changeOrigin: true,
        secure: false,
      },
      {
        context: (path) => {
          // CSS/JS for server-rendered pages should be served from backend
          return /^\/static\/[a-z]+\.[0-9a-fA-F]+\.(css|js)$/.test(path);
        },
        target: redashBackend + '/',
        changeOrigin: true,
        secure: false,
      }
    ],
    stats: {
      modules: false,
      chunkModules: false,
    },
  }
};

if (process.env.DEV_SERVER_HOST) {
  config.devServer.host = process.env.DEV_SERVER_HOST;
}

if (process.env.NODE_ENV === 'production') {
  config.output.filename = '[name].[chunkhash].js';
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    compress: {
      warnings: true
    }
  }));
  config.devtool = 'source-map';
}

if (process.env.BUNDLE_ANALYZER) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;
