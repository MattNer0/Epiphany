import fs from 'fs'
import path from 'path'
import url from 'url'
import http from 'http'
import https from 'https'

function decideProtocol(url) {
	if (url.indexOf('https') === 0) {
		return https
	}
	return http
}

export default {
	getFileDataFromUrl(fileUrl) {
		const pathUrl = (new url.URL(fileUrl)).pathname
		return {
			basename : path.basename(pathUrl),
			cleanname: this.cleanFileName(path.basename(pathUrl, path.extname(pathUrl))) + path.extname(pathUrl),
			extname  : path.extname(pathUrl)
		}
	},

	cleanFileName(name) {
		return name.replace(/[^\w _-]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').substr(0, 40).trim()
	},

	downloadMultipleFiles(arrayUrls, targetFolder) {
		arrayUrls.forEach((url) => {
			this.downloadFile(url, targetFolder)
		})
	},
	getBase64Image(sourceUrl, callback) {
		decideProtocol(sourceUrl).get(sourceUrl, (res) => {
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

		const file = path.join(targetFolder, filename)
		decideProtocol(sourceUrl).get(sourceUrl, (res) => {
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
