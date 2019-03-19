import fs from 'fs'
import path from 'path'

import utilFile from '../utils/file'
import elosenv from '../utils/elosenv'

class Library {
	constructor (path) {
		if (path) {
			this._path = path
		} else {
			this._path = ''
		}
	}

	get baseLibraryPath() {
		return this._path
	}

	set baseLibraryPath(value) {
		this._path = value
	}

	doesLibraryExists() {
		if (this._path) return fs.existsSync(this._path)
		return false
	}

	initialLibrary() {

		function homeLibrary() {
			var p
			if (elosenv.isDarwin()) {
				p = path.join(elosenv.documentsPath(), 'library')
			} else {
				p = path.join(elosenv.homePath(), 'library')
			}
			return p
		}

		var p = path.join(elosenv.workingDirectory(), 'library')
		try {
			if (p.indexOf('/node_modules/electron/') >= 0) p = homeLibrary()
			if (!fs.existsSync(p)) fs.mkdirSync(p)
			fs.accessSync(p, fs.W_OK | fs.R_OK)
		} catch (e) {
			elosenv.console.warn(e.message)
			p = homeLibrary()
			try {
				if (!fs.existsSync(p)) fs.mkdirSync(p)
				fs.accessSync(p, fs.W_OK | fs.R_OK)
			} catch (e) {
				p = null
				elosenv.console.warn(e.message)
			}
		}
		return p
	}

	static moveLibrary(source, target) {
		if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
			var files = fs.readdirSync(target)
			if (files.length > 0) return false
		}

		utilFile.moveFolderRecursiveSync(
			source,
			path.dirname(target),
			path.basename(target)
		)
		return true
	}
}

export default Library
