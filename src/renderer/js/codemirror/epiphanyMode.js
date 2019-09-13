(function(CodeMirror) {

	CodeMirror.defineMode('epiphanymode', (config, modeConfig) => {

		var markdownConfig = {
			underscoresBreakWords: false,
			taskLists            : true,
			fencedCodeBlocks     : '```',
			strikethrough        : true,
			emoji                : true,
			highlightFormatting  : true,
			xml                  : false,
			tokenTypeOverrides   : {
				header       : 'epy-header',
				code         : 'epy-code',
				quote        : 'epy-quote',
				list1        : 'epy-list1',
				list2        : 'epy-list2',
				list3        : 'epy-list3',
				hr           : 'epy-hr',
				image        : 'epy-image',
				formatting   : 'epy-formatting',
				link         : 'epy-link',
				linkInline   : 'epy-link-inline',
				linkEmail    : 'epy-link-email',
				linkText     : 'epy-link-text',
				linkHref     : 'epy-link-href',
				em           : 'epy-em',
				strong       : 'epy-strong',
				strikethrough: 'epy-strikethrough'
			}
		}

		for (var attr in modeConfig) {
			markdownConfig[attr] = modeConfig[attr]
		}
		markdownConfig.name = 'gfm'
		return CodeMirror.getMode(config, markdownConfig)

	}, 'gfm')

	CodeMirror.defineMIME('text/x-epiphany', 'epiphanymode')
})(require('codemirror'), require('codemirror/addon/mode/overlay'), require('codemirror/mode/gfm/gfm'))
