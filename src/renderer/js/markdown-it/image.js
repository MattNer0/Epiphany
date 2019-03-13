'use strict'

function markdownitLinkifyImages (md, config) {
	md.renderer.rules.image = function (tokens, idx, options, env, self) {
		config = config || {}

		var token = tokens[idx]
		var srcIndex = token.attrIndex('src')
		var url = token.attrs[srcIndex][1]
		var title = ''
		var caption = token.content

		if (token.attrIndex('title') !== -1) {
			title = ' title="' + token.attrs[token.attrIndex('title')][1] + '"'
		}

		return '' +
			'<a class="image-link" href="#" onclick="' + generateOnClickAttribute(url) + '" >' +
				'<img src="' + url + '" alt="' + caption + '" ' + title + '>' +
			'</a>'
	}
}

function generateOnClickAttribute (url) {
	return "appVue.openImg('"+url+"'); return false;"
}

module.exports = markdownitLinkifyImages;
