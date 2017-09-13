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
    path: path.join(__dirname, 'client', 'dist'),
    filename: '[name].js',
    publicPath: '/'
  },

  plugins: [
    new WebpackBuildNotifierPlugin({title: 'Redash'}),
    new webpack.DefinePlugin({
      ON_TEST: process.env.NODE_ENV === 'test'
    }),
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
      template: './client/app/index.html'
    }),
    new HtmlWebpackPlugin({
      template: './client/app/multi_org.html',
      filename: 'multi_org.html'
    }),
    new ExtractTextPlugin({
      filename: 'styles.[chunkhash].css'
    })
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
        test: /\.scss$/,
        use: ExtractTextPlugin.extract([
          {
            loader: 'css-loader',
            options: {
              minimize: process.env.NODE_ENV === 'production'
            }
          }, {
            loader: 'sass-loader'
          }
        ])
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'img/[name].[hash:7].[ext]'
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
  devServer: {
    inline: true,
    historyApiFallback: true,
    contentBase: path.join(__dirname, 'client', 'app'),
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
  config.output.filename = '[name].[chunkhash].js';
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    compress: {
      warnings: true
    }
  }));
  config.devtool = 'source-map';
}

module.exports = config;
