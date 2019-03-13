require('es6-promise').polyfill();

const webpack = require('webpack');

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
	new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
];

module.exports = {
	module: {
		rules: [
			{
				test: /\.pug$/,
				use: 'pug-plain-loader'
			}, {
				test: /\.html$/,
				loader: 'html-loader',
				options: {
					'attrs' : false
				}
			}
		]
	},
	externals: {
		sqlite: 'commonjs sqlite'
	},
	plugins: webpackPlugins
};
