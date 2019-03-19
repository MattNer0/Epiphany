import LZMA from 'lzma'

var DATA_PREFIX_BXZE = 'data:text/html;charset=utf-8;bxze64,'

function stringToZip(string, callback) {
	LZMA.compress(string, 9, function(result, error) {
		if (error) console.error(error)
		var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(result)))
		return callback(base64String)
	})
}

export default {
	get_uri(previewHtml, noteTitle, callback) {
		var text = previewHtml.replace(/[\n|\t]+/g, ' ').replace(/> +</g, '> <')
		stringToZip(text, function(zip) {

			var url = DATA_PREFIX_BXZE + zip
			var title = ''
			if (noteTitle) title = encodeURIComponent(noteTitle.trim().replace(/\s/g, '_'))

			if (zip.length) {
				url = 'https://itty.bitty.site/#' + (title || '') + '/' + url
			} else {
				url = ''
			}
			return callback(url)
		})
	}
}
