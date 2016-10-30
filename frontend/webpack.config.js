/* eslint-disable */

var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");


var config = {
  entry: {
    app: './app/index.js'
  },
  output: {
    path: './dist',
    filename: '[name].js'
  },

  plugins: [
    new webpack.DefinePlugin({
      ON_TEST: process.env.NODE_ENV === 'test'
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
          // name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url',
        query: {
          limit: 10000,
          // name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
        }
      }

    ]
  },
  devServer: {
    inline: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000/default',
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
