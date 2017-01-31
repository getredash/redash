/* eslint-disable */

var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var WebpackBuildNotifierPlugin = require('webpack-build-notifier');
var path = require('path');

var redashBackend = process.env.REDASH_BACKEND || 'http://localhost:5000';

var config = {
  entry: {
    app: './client/app/index.js'
  },
  output: {
    // path: process.env.NODE_ENV === 'production' ? './dist' : './dev',
    path: './client/dist',
    filename: '[name].[chunkhash].js',
  },

  plugins: [
    new WebpackBuildNotifierPlugin({title: 'Redash'}),
    new webpack.DefinePlugin({
      ON_TEST: process.env.NODE_ENV === 'test'
    }),
    new webpack.optimize.DedupePlugin(),
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
      // template: __dirname + '/app/' + 'index.html'
      template: './client/app/index.html'
    }),
    new ExtractTextPlugin('styles.[chunkhash].css')
  ],

  module: {
    loaders: [
      {test: /\.js$/, loader: 'ng-annotate!babel!eslint', exclude: /node_modules/},
      {test: /\.html$/, loader: 'raw', exclude: [/node_modules/, /index\.html/]},
      // {test: /\.css$/, loader: 'style!css', exclude: /node_modules/},
      {test: /\.css$/, loader: ExtractTextPlugin.extract("css-loader")},
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract(["css-loader", "sass-loader"])
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url',
        query: {
          limit: 10000,
          name: 'img/[name].[hash:7].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url',
        query: {
          limit: 10000,
          name: 'fonts/[name].[hash:7].[ext]'
        }
      }

    ]
  },
  devtool: 'cheap-eval-module-source-map',
  devServer: {
    inline: true,
    historyApiFallback: true,
    proxy: {
      '/login': {
        target: redashBackend + '/',
        secure: false
      },
      '/invite': {
        target: redashBackend + '/',
        secure: false
      },
      '/setup': {
        target: redashBackend + '/',
        secure: false
      },
      '/images': {
        target: redashBackend + '/',
        secure: false
      },
      '/js': {
        target: redashBackend + '/',
        secure: false
      },
      '/styles': {
        target: redashBackend + '/',
        secure: false
      },
      '/status.json': {
        target: redashBackend + '/',
        secure: false
      },
      '/api/admin': {
        target: redashBackend + '/',
        secure: false
      },
      '/api': {
        target: redashBackend,
        secure: false
      }
    }
  }
};

if (process.env.DEV_SERVER_HOST) {
  config.devServer.host = process.env.DEV_SERVER_HOST;
}

if (process.env.NODE_ENV === 'production') {
  config.output.path = __dirname + '/client/dist';
  config.plugins.push(new webpack.optimize.UglifyJsPlugin());
  config.devtool = 'source-map';
}

module.exports = config;
