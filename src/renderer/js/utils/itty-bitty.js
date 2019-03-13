import LZMA from "lzma";

var DATA_PREFIX_BXZE = 'data:text/html;charset=utf-8;bxze64,'

function stringToZip(string, callback) {
	LZMA.compress(string, 9, function(result, error) {
		if (error) console.error(error);
		var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(result)));
		return callback(base64String);
	});
}

export default {
	get_uri(preview_html, note_title, callback) {
		var text = preview_html.replace(/[\n|\t]+/g,' ').replace(/> +</g, '> <');
		stringToZip(text, function(zip) {

			var url = DATA_PREFIX_BXZE + zip;
			var title = "";
			if (note_title) title = encodeURIComponent(note_title.trim().replace(/\s/g, "_"));

			if (zip.length) {
				url = "https://itty.bitty.site/#" + (title || "") + "/" + url;
			} else {
				url = "";
			}
			return callback(url);
		});
	},
}