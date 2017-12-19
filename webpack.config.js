/* eslint-disable */

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const LessPluginAutoPrefix = require('less-plugin-autoprefix');
const path = require('path');

const redashBackend = process.env.REDASH_BACKEND || 'http://localhost:5000';

const config = {
  entry: {
    app: ['./client/app/index.js', './client/app/assets/less/main.less'],
  },
  output: {
    path: path.join(__dirname, 'client', 'dist'),
    filename: '[name].js',
    publicPath: '/'
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'client/app')
    }
  },
  plugins: [
    new WebpackBuildNotifierPlugin({title: 'Redash'}),
    new webpack.DefinePlugin({
      ON_TEST: process.env.NODE_ENV === 'test'
    }),
    // Enforce angular to use jQuery instead of jqLite
    new webpack.ProvidePlugin({'window.jQuery': 'jquery'}),
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
            context: path.resolve(__dirname, './client/app/assets/images/'),
            outputPath: 'img/',
            name: '[path][name].[ext]',
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
  devServer: {
    inline: true,
    historyApiFallback: true,
    contentBase: path.join(__dirname, 'client', 'app'),
    proxy: [{
      context: [
        '/login', '/invite', '/setup', '/images', '/js', '/styles',
        '/status.json', '/api', '/oauth'],
      target: redashBackend + '/',
      changeOrigin: true,
      secure: false,
    }],
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
