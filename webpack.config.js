require('es6-promise').polyfill();

const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var isProduction = process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'production';

const { VueLoaderPlugin } = require('vue-loader');

var webpackPlugins = [
	new webpack.DefinePlugin({
		ENV: JSON.stringify(process.env.NODE_ENV || 'production')
	}),
	new webpack.ExternalsPlugin('commonjs', [
		'electron',
		'lodash',
		'fs',
		'path',
		'jss',
		'highlight.js',
		'lzma',
		'marked',
		'moment',
		'datauri'
	]),
	new VueLoaderPlugin(),
	new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
];

if (isProduction) {
	webpackPlugins.push(new UglifyJSPlugin({
		parallel: true,
		uglifyOptions: {
			ie8: false,
			ecma: 8,
			output: {
				comments: false,
				beautify: false
			},
		}
	}));
}

module.exports = {
	mode: isProduction ? 'production' : 'development',
	entry: {
		app       : './src/js/main.js',
		popup     : './src/js/popup.js',
		background: './src/js/background.js',
		bbrowser  : './src/js/bbrowser.js'
	},
	output: {
		path    : __dirname + '/dist/build/',
		filename: '[name].js'
	},
	resolve: {
		alias: {
			vue     : isProduction ? 'vue/dist/vue.min.js' : 'vue/dist/vue.js',
			autosize: isProduction ? 'autosize/dist/autosize.min.js': 'autosize/dist/autosize.js'
		}
	},
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: 'vue-loader'
			}, {
				test: /\.pug$/,
				loader: 'pug-plain-loader'
			}, {
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /(node_modules|dist)/
			}, {
				test: /\.(png|woff|woff2|ttf|svg)$/,
				loader: 'url-loader',
				options: {
					'limit' : 100000
				}
			}, {
				test: /\.html$/,
				loader: 'html-loader',
				options: {
					'attrs' : false
				}
			}, {
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			}, {
				test: /\.scss$/,
				use: [
					'vue-style-loader',
					'css-loader',
					'sass-loader'
				]
			}
		]
	},
	plugins: webpackPlugins
};
