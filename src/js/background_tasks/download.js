import fs from "fs";
import path from "path";
import url from "url";
import http from "http";

export default {
	getFileDataFromUrl(file_url) {
		var path_url = url.parse(file_url).pathname;
		return {
			basename: path.basename(path_url),
			extname: path.extname(path_url)
		};
	},
	downloadMultipleFiles(array_urls, target_folder) {
		array_urls.forEach((url) => {
			this.downloadFile(url, target_folder);
		});
	},
	getBase64Image(source_url, callback) {
		http.get(source_url, function (res) {
			res.setEncoding('binary');
			var body = '';
			res.on('data', (chunk) => {
				body += chunk;
			});
			res.on('end', () => {
				return callback("data:" + res.headers["content-type"] + ";base64," + new Buffer(body, 'binary').toString('base64'));
			});
		});
	},
	downloadFile(source_url, target_folder, filename) {
		if (!filename) filename = this.getFileDataFromUrl(source_url).cleanname;
		if (!target_folder || !filename) return;

		var file = path.join(target_folder, filename);
		http.get(source_url, function(res) {
			var imagedata = '';
			res.setEncoding('binary');
			res.on('data', function(chunk) {
				imagedata += chunk;
			});
			res.on('end', function() {
				fs.writeFile(file, imagedata, 'binary', function(err) {
					if (err) throw err;
					console.log('Downloaded', filename, 'to', target_folder);
				});
			});
		});
	}
};
