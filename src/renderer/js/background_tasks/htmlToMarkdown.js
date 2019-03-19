import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

var turndownService = new TurndownService({
	hr              : '---',
	headingStyle    : 'atx',
	bulletListMarker: '*',
	codeBlockStyle  : 'fenced'
})

turndownService.use(gfm)
turndownService.addRule('article', {
	filter: ['span', 'article'],
	replacement(content) {
		return content
	}
})
turndownService.addRule('div', {
	filter: ['div'],
	replacement(content) {
		return '\n' + content + '\n'
	}
})
turndownService.addRule('script', {
	filter: ['script', 'style', 'noscript', 'form', 'nav', 'iframe', 'input', 'header', 'footer'],
	replacement(content) {
		return ''
	}
})

export default {

	parseScript() {
		var elements = [
			"document.querySelector('article') ? document.querySelector('article').innerHTML",
			"document.querySelector('#article_item') ? document.querySelector('#article_item').innerHTML",
			"document.querySelector('*[role=\"article\"]') ? document.querySelector('*[role=\"article\"]').innerHTML",
			"document.querySelector('*[itemprop=\"articleBody\"]') ? document.querySelector('*[itemprop=\"articleBody\"]').parentNode.innerHTML",
			"document.querySelector('*[role=\"main\"]') ? document.querySelector('*[role=\"main\"]').innerHTML",
			"document.querySelector('.post-container') ? document.querySelector('.post-container').innerHTML",
			"document.querySelector('.content-body') ? document.querySelector('.content-body').innerHTML",
			"document.querySelector('div[itemtype=\"http://schema.org/Question\"]') ? document.querySelector('div[itemtype=\"http://schema.org/Question\"]').innerHTML",
			"document.querySelector('p + p + p + p') ? document.querySelector('p + p + p + p').parentNode.innerHTML",
			"document.querySelector('body').innerHTML"
		]

		return elements.join(' : ')
	},

	convert(htmlSource, pageUrl, pageTitle) {
		var newMd = turndownService.turndown(htmlSource)
		newMd = newMd.replace(/\n+/gi, '\n')
		newMd = newMd.replace(/(!\[\]\(.+?\))(\s*\1+)/gi, '$1')
		newMd = newMd.replace(/(\[!\[.*?\].+?\]\(.+?\))/gi, '\n$1\n')
		newMd = newMd.replace(/\]\(\/\//gi, '](http://')

		if (!newMd.match(/^# /gm)) {
			newMd = '# ' + pageTitle + '\n\n' + newMd
		}

		if (newMd && pageUrl) newMd = '[Source](' + pageUrl + ')\n\n' + newMd

		return newMd
	}
}
