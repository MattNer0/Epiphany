import fs from 'fs'
import path from 'path'
import url from 'url'

import electron from 'electron'

/**
 * copy source file into the target directory.
 *
 * @param  {String}   source  The source
 * @param  {String}   target  The target
 * @return {Void} Function doesn't return anything
 */
function copyFileSync(source, target) {
	var targetFile = target

	//if target is a directory a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source))
		}
	}
	fs.writeFileSync(targetFile, fs.readFileSync(source))
}

/**
 * move source file into the target directory.
 *
 * @param  {String}   source  The source
 * @param  {String}   target  The target
 * @return {Void} Function doesn't return anything
 */
function moveFileSync(source, target) {
	var targetFile = target

	//if target is a directory a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source))
		}
	}
	fs.renameSync(source, targetFile)
}

export default {
	deleteFile(path) {
		if (path && fs.existsSync(path)) {
			if (!electron.shell.moveItemToTrash(path)) {
				fs.unlinkSync(path)
			}
		}
	},
	deleteFolderRecursive(target) {
		if (!fs.existsSync(target)) {
			return
		}

		if (fs.lstatSync(target).isDirectory()) {
			var files = fs.readdirSync(target)
			files.forEach((file, index) => {
				var curPath = path.join(target, file)
				this.deleteFolderRecursive(curPath)
			})
			fs.rmdirSync(target)
		} else {
			fs.unlinkSync(target)
		}
	},
	safeName(name) {
		return name.replace(/[/\\¥]/g, '-')
	},
	copyFolderRecursiveSync(source, target) {
		var files = []

		if (!fs.existsSync(source)) {
			return
		}

		//check if folder needs to be created or integrated
		var targetFolder = path.join(target, path.basename(source))
		if (!fs.existsSync(targetFolder)) {
			fs.mkdirSync(targetFolder)
		}

		if (fs.lstatSync(source).isDirectory()) {
			files = fs.readdirSync(source)
			files.forEach((file) => {
				var curSource = path.join(source, file)
				if (fs.lstatSync(curSource).isDirectory()) {
					this.copyFolderRecursiveSync(curSource, targetFolder)
				} else {
					copyFileSync(curSource, targetFolder)
				}
			})
		}
	},
	moveFolderRecursiveSync(source, target, newName) {
		if (!fs.existsSync(source)) {
			return
		}

		//check if folder needs to be created or integrated
		var targetFolder = path.join(target, newName || path.basename(source))
		if (!fs.existsSync(targetFolder)) {
			fs.mkdirSync(targetFolder)
		}

		if (fs.lstatSync(source).isDirectory()) {
			var files = fs.readdirSync(source)
			files.forEach((file) => {
				var curSource = path.join(source, file)
				if (fs.lstatSync(curSource).isDirectory()) {
					this.moveFolderRecursiveSync(curSource, targetFolder)
				} else {
					moveFileSync(curSource, targetFolder)
				}
			})
			fs.rmdirSync(source)
		}
	},
	cleanFileName(name) {
		return name.replace(/[^\w _-]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').substr(0, 40).trim()
	},
	copyFileSync(source, target) {
		fs.writeFileSync(target, fs.readFileSync(source))
	},
	getFileNameFromUrl(fileUrl) {
		return this.getFileDataFromUrl(fileUrl).basename
	},
	getFileExtensionFromUrl(fileUrl) {
		return this.getFileDataFromUrl(fileUrl).extname
	},
	getFileDataFromUrl(fileUrl) {
		var pathUrl = (new url.URL(fileUrl)).pathname
		return {
			basename : path.basename(pathUrl),
			cleanname: this.cleanFileName(path.basename(pathUrl, path.extname(pathUrl))) + path.extname(pathUrl),
			extname  : path.extname(pathUrl)
		}
	}
}
