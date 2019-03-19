import fs from 'fs'
import path from 'path'
import url from 'url'
import http from 'http'

export default {
	getFileDataFromUrl(fileUrl) {
		var pathUrl = (new url.URL(fileUrl)).pathname
		return {
			basename : path.basename(pathUrl),
			cleanname: this.cleanFileName(path.basename(pathUrl)),
			extname  : path.extname(pathUrl)
		}
	},

	cleanFileName(name) {
		return name.replace(/[^\w _-]/g, '').replace(/\s+/g, ' ').substr(0, 40).trim()
	},

	downloadMultipleFiles(arrayUrls, targetFolder) {
		arrayUrls.forEach((url) => {
			this.downloadFile(url, targetFolder)
		})
	},
	getBase64Image(sourceUrl, callback) {
		http.get(sourceUrl, (res) => {
			res.setEncoding('binary')
			var body = ''
			res.on('data', (chunk) => {
				body += chunk
			})
			res.on('end', () => {
				return callback('data:' + res.headers['content-type'] + ';base64,' + Buffer.from(body, 'binary').toString('base64'))
			})
		})
	},
	downloadFile(sourceUrl, targetFolder, filename) {
		if (!filename) filename = this.getFileDataFromUrl(sourceUrl).cleanname
		if (!targetFolder || !filename) return

		var file = path.join(targetFolder, filename)
		http.get(sourceUrl, (res) => {
			var imagedata = ''
			if (('' + res.statusCode).match(/^2\d\d$/)) {
				res.setEncoding('binary')
				res.on('data', function(chunk) {
					imagedata += chunk
				})
				res.on('end', function() {
					fs.writeFile(file, imagedata, 'binary', function(err) {
						if (err) throw err
						console.log('Downloaded', filename, 'to', targetFolder)
					})
				})
			}
		})
	}
}
