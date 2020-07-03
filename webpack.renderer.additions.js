require('es6-promise').polyfill()

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isDevelopment = process.env.NODE_ENV === 'development'

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
]

const configuration = {
	entry : {},
	module: {
		rules: [
			{
				test: /\.pug$/,
				use : 'pug-plain-loader'
			}, {
				test   : /\.html$/,
				loader : 'html-loader',
				options: {
					// Disables attributes processing
					attributes: false
				}
			}
		]
	},
	externals: {
		'aws-sdk': 'aws-sdk',
		'sqlite' : 'commonjs sqlite'
	},
	plugins: webpackPlugins
}

const addChunk = (entry, renderer, addHtmlFile) => {
	if (isDevelopment) {
		configuration.entry[entry] = [
			'css-hot-loader/hotModuleReplacement',
			`./src/renderer/${renderer}`
		]
	} else {
		configuration.entry[entry] = `./src/renderer/${renderer}`
	}

	if (addHtmlFile) {
		configuration.plugins.push(new HtmlWebpackPlugin({
			'template'      : '!!html-loader?minimize=false!dist/.renderer-index-template.html',
			'filename'      : `${entry}.html`,
			'hash'          : false,
			'inject'        : true,
			'compile'       : true,
			'favicon'       : false,
			'minify'        : false,
			'cache'         : true,
			'showErrors'    : true,
			'chunks'        : ['theme', entry],
			'excludeChunks' : [],
			'chunksSortMode': 'auto',
			'meta'          : {},
			'title'         : `Chunk ${entry}`,
			'xhtml'         : false
		}))
	}
}

addChunk('theme', 'styles.js', false)
addChunk('app', 'app.js', true)
addChunk('popup', 'popup.js', true)
addChunk('background', 'background.js', true)
addChunk('bbrowser', 'bbrowser.js', true)

module.exports = configuration
