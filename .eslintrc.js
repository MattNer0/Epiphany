module.exports = {
	root: true,

	parserOptions: {
		parser: 'babel-eslint',
		sourceType: 'module'
	},

	env: {
		browser: true,
		node: true
	},

	extends: [
		'plugin:vue/essential',
		'@vue/standard'
	],

	// required to lint *.vue files
	plugins: [
		'vue'
	],

	globals: {
		'__static': true,
		'appVue'  : true
	},

	// add your custom rules here
	rules: {
		// allow async-await
		'generator-star-spacing': 'off',
		// allow paren-less arrow functions
		'arrow-parens': 0,
		'one-var': 0,

		'no-tabs': 0,
		'spaced-comment': 0,
		'no-extra-boolean-cast': 0,
		'space-before-function-paren': 0,
		'space-infix-ops': 0,
		'padded-blocks': 0,
		'no-useless-call': 0,
		'standard/no-callback-literal': 0,
		'no-multiple-empty-lines': 0,
		'indent': ['error', 'tab', { "SwitchCase": 1 }],
		'key-spacing': ['error', { 'align': 'colon' }],
		'quote-props': ['error', 'consistent'],

		'import/first': 0,
		'import/named': 2,
		'import/namespace': 2,
		'import/default': 2,
		'import/export': 2,
		'import/extensions': 0,
		'import/no-unresolved': 0,
		'import/no-extraneous-dependencies': 0,

		// allow console.log during development only
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		// allow debugger during development only
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
	}
}
