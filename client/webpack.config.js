/* eslint-disable */

var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var WebpackBuildNotifierPlugin = require('webpack-build-notifier');
var path = require('path');


var config = {
  entry: {
    app: './app/index.js'
  },
  output: {
    // path: process.env.NODE_ENV === 'production' ? './dist' : './dev',
    path: './dist',
    filename: '[name].js',
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
      template: './app/index.html'
    }),
    new ExtractTextPlugin('styles.css')
  ],

  module: {
    loaders: [
      {test: /\.js$/, loader: 'ng-annotate!babel!eslint', exclude: /node_modules/},
      {test: /\.html$/, loader: 'raw', exclude: [/node_modules/,/index\.html/]},
      // {test: /\.css$/, loader: 'style!css', exclude: /node_modules/},
      {test: /\.css$/, loader: ExtractTextPlugin.extract("css-loader") },
      {test: /\.styl$/, loader: 'style!css!stylus', exclude: /node_modules/},
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
  // devtool: 'eval-source-map',
  devtool: 'cheap-eval-source-map',
  devServer: {
    inline: true,
    historyApiFallback: true,
    proxy: {
      '/login': {
        target: 'http://localhost:5000/',
        secure: false
      },
      '/status.json': {
        target: 'http://localhost:5000/',
        secure: false
      },
      '/api/admin': {
        target: 'http://localhost:5000/',
        secure: false
      },
      '/api': {
        target: 'http://localhost:5000',
        secure: false
      }
    }
  }
};

if (process.env.NODE_ENV === 'production') {
  config.output.path = __dirname + '/dist';
  config.plugins.push(new webpack.optimize.UglifyJsPlugin());
  config.devtool = 'source-map';
}

module.exports = config;
