import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import sqlite from 'sqlite'

import models from '../models'

/**
 * @function getValidMarkdownFormats
 * @return {Array} Array of valid formats
 */
function getValidMarkdownFormats() {
	return ['.md', '.markdown', '.txt', '.mdencrypted', '.opml']
}

/**
 * @function getValidImageFormats
 * @return {Array} Array of valid formats
 */
function getValidImageFormats() {
	return ['.jpg', '.jpeg', '.bmp', '.gif', '.png']
}

/**
 * @function isValidNotePath
 * @param  {type} notePath {description}
 * @return {type} {description}
 */
function isValidNotePath(notePath) {
	var validFormats = getValidMarkdownFormats()
	var noteStat = fs.statSync(notePath)
	var noteExt = path.extname(notePath)
	if (noteStat.isFile() && validFormats.indexOf(noteExt) >= 0) {
		return {
			ext : noteExt,
			stat: noteStat
		}
	}
	return false
}

/**
 * @function isValidImagePath
 * @param  {type} imagePath {description}
 * @return {type} {description}
 */
function isValidImagePath(imagePath) {
	var validFormats = getValidImageFormats()
	var imageStat = fs.statSync(imagePath)
	var imageExt = path.extname(imagePath)
	if (imageStat.isFile() && validFormats.indexOf(imageExt) >= 0) {
		return {
			ext : imageExt,
			stat: imageStat
		}
	}
	return false
}

function readBucketData(bucketPath) {
	var bucketJson = path.join(bucketPath, '.bucket.json')
	if (fs.existsSync(bucketJson)) {
		return JSON.parse(fs.readFileSync(bucketJson, 'utf-8'))
	}
	return {}
}

function readFolderData(folderPath) {
	var folderJson = path.join(folderPath, '.folder.json')
	if (fs.existsSync(folderJson)) {
		return JSON.parse(fs.readFileSync(folderJson, 'utf-8'))
	}
	return {}
}

export default {

	async initDB(library) {
		models.setBaseLibraryPath(library)
		var db = await sqlite.open(path.join(library, 'epiphany.db'))
		await db.run('CREATE TABLE IF NOT EXISTS notes '+
			'(id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, name TEXT, photo TEXT, summary TEXT, ' +
			'updated_at INTEGER, created_at INTEGER, CONSTRAINT path_unique UNIQUE (path))')

		//var diff = new Date().getTime() - 16070400000
		//await db.run('DELETE FROM notes WHERE updated_at < ?', diff);

		return db
	},

	readRacks(library) {
		var validRacks = []
		if (fs.existsSync(library)) {
			var racks = fs.readdirSync(library)
			for (var ri = 0; ri < racks.length; ri++) {
				var rack = racks[ri]
				var rackPath = path.join(library, rack)

				if (fs.existsSync(rackPath) && rack.charAt(0) !== '.') {
					var rackStat = fs.statSync(rackPath)
					if (rackStat.isDirectory()) {
						var rackData = {}
						try {
							rackData = readBucketData(rackPath)
						} catch (err) {
							rackData = {}
						}

						if (rack === '_quick_notes') {
							rackData.ordering = 0
						}

						validRacks.push({
							_type      : 'rack',
							name       : rack,
							quick_notes: rack === '_quick_notes',
							hide_label : rackData.hidelabel,
							ordering   : isNaN(rackData.ordering) ? racks.length + ri + 1 : parseInt(rackData.ordering),
							icon       : rackData.icon || '',
							path       : rackPath
						})
					}
				}
			}
		}
		return validRacks
	},
	readFoldersByParent(parentFolder) {
		try {
			var validFolders = []
			var folders = fs.readdirSync(parentFolder)
			folders = folders.filter(function(obj) {
				return obj.charAt(0) !== '.'
			})
			for (var fi = 0; fi < folders.length; fi++) {
				var folderPath = path.join(parentFolder, folders[fi])
				var folderStat = fs.statSync(folderPath)
				if (folderStat.isDirectory()) {
					var folderData = {}
					try {
						folderData = readFolderData(folderPath)
					} catch (err) {
						folderData = {}
					}
					validFolders.push({
						name    : folders[fi],
						ordering: folderData.ordering ? parseInt(folderData.ordering) : fi+1,
						path    : folderPath,
						folders : this.readFoldersByParent(folderPath)
					})
				}
			}
			return validFolders
		} catch (err) {
			log.error(err.message)
			return []
		}
	},
	async readNotesByFolder(library, folder, db) {
		if (!fs.existsSync(folder)) return []

		var validNotes = []
		var notes = fs.readdirSync(folder)
		var note

		for (note of notes) {
			var notePath = path.join(folder, note)
			var noteCache = await this.findNoteInDB(db, library, notePath)
			if (noteCache) {
				validNotes.push(noteCache)

			} else if (fs.existsSync(notePath) && note.charAt(0) !== '.') {
				var newNote = this.readNewNote(notePath)
				if (newNote) validNotes.push(newNote)
			}
		}
		return validNotes
	},
	async readImagesByFolder(folder) {
		if (!fs.existsSync(folder)) return []

		var validImages = []
		var images = fs.readdirSync(folder)
		images.forEach((img) => {
			var imgPath = path.join(folder, img)
			if (fs.existsSync(imgPath) && img.charAt(0) !== '.') {
				var imgData = isValidImagePath(imgPath)
				if (imgData) {
					validImages.push({
						path: imgPath,
						name: img
					})
				}
			}
		})
		return validImages
	},
	readNote(notePath, noteData, withBody) {
		var note = path.basename(notePath, noteData.ext)
		var body = null
		var createdAt = noteData.stat && noteData.stat.birthtime ? noteData.stat.birthtime.valueOf() : null
		var updatedAt = noteData.stat && noteData.stat.mtime ? noteData.stat.mtime.valueOf() : null
		if (withBody) body = fs.readFileSync(notePath).toString()
		switch (noteData.ext) {
			case '.mdencrypted':
				return {
					type      : 'encrypted',
					name      : note,
					body      : body,
					path      : notePath,
					created_at: createdAt,
					updated_at: updatedAt,
					extension : noteData.ext
				}
			case '.opml':
				return {
					type      : 'outline',
					name      : note,
					body      : body,
					path      : notePath,
					created_at: createdAt,
					updated_at: updatedAt,
					extension : noteData.ext
				}
			default:
				return {
					type      : 'note',
					name      : note,
					body      : body,
					path      : notePath,
					created_at: createdAt,
					updated_at: updatedAt,
					extension : noteData.ext
				}
		}
	},
	isNoteFile(filePath) {
		if (!filePath) return false
		return isValidNotePath(filePath)
	},
	readNewNote(notePath) {
		var noteData = isValidNotePath(notePath)
		if (noteData) {
			return this.readNote(notePath, noteData, false)
		}
		return null
	},
	async insertNoteInDB(db, finalNote) {
		let relativePath = finalNote.path
		let photoPath = finalNote.photo
		if (path.sep === '\\') {
			relativePath = relativePath.split(path.sep).join('/')
			photoPath = photoPath.split(path.sep).join('/')
		}
		var data = await db.get('SELECT * FROM notes WHERE path = ? LIMIT 1', relativePath)
		if (data) {
			if (data.summary !== finalNote.summary || data.name !== finalNote.name || data.updated_at !== finalNote.updated_at || data.photo !== photoPath) {
				await db.run('UPDATE notes SET (name, summary, photo, created_at, updated_at) = (?, ?, ?, ?, ?) WHERE path = ?',
					[finalNote.name, finalNote.summary, photoPath, finalNote.created_at, finalNote.updated_at, relativePath])
			}
		} else {
			await db.run('INSERT INTO notes (name, summary, photo, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
				[finalNote.name, finalNote.summary, photoPath, finalNote.path, finalNote.created_at, finalNote.updated_at])
		}
	},
	async deleteNoteFromDB(db, library, notePath) {
		try {
			let relativePath = path.relative(library, notePath)
			if (path.sep === '\\') {
				relativePath = relativePath.split(path.sep).join('/')
			}
			await db.run('DELETE FROM notes WHERE path = ?', relativePath)
		} catch (err) {
			log.error(err.message)
		}
	},
	async findNoteInDB(db, library, notePath) {
		try {
			let relativePath = path.relative(library, notePath)
			if (path.sep === '\\') {
				relativePath = relativePath.split(path.sep).join('/')
			}
			var data = await db.get('SELECT * FROM notes WHERE path = ? LIMIT 1', relativePath)
			if (data) {
				var extension = path.extname(notePath)
				var type

				switch (extension) {
					case '.mdencrypted':
						type = 'encrypted'
						break
					case '.opml':
						type = 'outline'
						break
					default:
						type = 'note'
				}

				return {
					type      : type,
					name      : data.name,
					summary   : data.summary,
					path      : path.join(library, data.path),
					photo     : data.photo ? path.join(library, data.photo) : null,
					created_at: data.created_at,
					updated_at: data.updated_at,
					extension : extension
				}
			}
		} catch (err) {
			log.error(err.message)
		}

		return null
	}
}
