import fs from 'fs'
import path from 'path'
import log from 'electron-log'

import models from '../models'
import utilFile from '../utils/file'

import Dexie from 'dexie'
const idbCon = new Dexie('epiphany')
import { exportDB, importInto } from 'dexie-export-import'

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

const importDB = async function(library) {
	idbCon.version(1).stores({
		notes: '++id, name, summary, photo, favorite, &path, created_at, updated_at'
	})
	idbCon.version(2).stores({
		notes   : '++id, name, summary, photo, favorite, &path, created_at, updated_at',
		settings: '++id, &key, value'
	})

	try {
		var dbDump = path.join(library, 'library.json')
		if (fs.existsSync(dbDump)) {
			const content = fs.readFileSync(dbDump, 'utf-8')
			const blob = new Blob([content], { type: 'application/json' })
			await importInto(idbCon, blob, {
				acceptVersionDiff: true,
				overwriteValues  : true
			})
			return
		}
	} catch (err) {
		console.warn(err.message)
	}
}

export default {
	async initDB(library) {
		models.setBaseLibraryPath(library)
		if (idbCon.isOpen()) return
		return importDB(library)
	},

	async closeDB() {
		if (idbCon.isOpen()) {
			idbCon.notes.clear()
			idbCon.close()
		}
	},

	async exportDB(library) {
		var dbDump = path.join(library, 'library.json')
		const blob = await exportDB(idbCon)
		const fr = new FileReader()
		fr.onload = function() {
			fs.writeFileSync(dbDump, this.result)
		}
		fr.readAsText(blob)
	},

	async loadSettingsDB(key) {
		try {
			const data = await idbCon.settings.where('key').equals(key).first()
			return data ? data.value : null
		} catch (err) {
			console.warn(err.message)
		}
		return null
	},

	async saveSettingsDB(key, value) {
		try {
			const data = await idbCon.settings.where('key').equals(key).first()

			if (data) {
				await idbCon.settings
					.where('key')
					.equals(key)
					.modify({
						'value': value
					})
			} else {
				await idbCon.settings.put({
					'key'  : key,
					'value': value
				})
			}
			return true
		} catch (err) {
			console.warn(err.message)
		}
		return false
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
	async readNotesByFolder(library, folder) {
		if (!fs.existsSync(folder)) return []

		const validNotes = []
		const notes = fs.readdirSync(folder)
		let note

		for (note of notes) {
			const notePath = path.join(folder, note)
			const noteData = isValidNotePath(notePath)
			if (noteData) {
				var noteCache = await this.findNoteInDB(library, notePath, noteData)
				if (noteCache) {
					validNotes.push(noteCache)

				} else if (fs.existsSync(notePath) && note.charAt(0) !== '.') {
					var newNote = this.readNote(notePath, noteData, false)
					if (newNote) validNotes.push(newNote)
				}
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
					size      : noteData.stat.size,
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
					size      : noteData.stat.size,
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
					size      : noteData.stat.size,
					extension : noteData.ext
				}
		}
	},
	isNoteFile(filePath) {
		if (!filePath) return false
		return isValidNotePath(filePath)
	},
	async insertNotesInDB(requestData) {
		for (let i=0; i<requestData.notes.length; i++) {
			await this.insertNoteInDB(requestData.notes[i])
		}
	},
	async insertNoteInDB(finalNote) {
		let relativePath = finalNote.path
		let photoPath = finalNote.photo
		if (path.sep === '\\') {
			relativePath = relativePath.split(path.sep).join('/')
			photoPath = photoPath ? photoPath.split(path.sep).join('/') : ''
		}

		const data = await idbCon.notes.where('path').equals(relativePath).first()

		if (data) {
			await idbCon.notes
				.where('path')
				.equals(relativePath)
				.modify({
					name      : finalNote.name,
					summary   : finalNote.summary,
					photo     : photoPath,
					favorite  : finalNote.favorite ? 1 : 0,
					created_at: finalNote.created_at,
					updated_at: finalNote.updated_at
				})
		} else {
			await idbCon.notes.put({
				name      : finalNote.name,
				summary   : finalNote.summary,
				photo     : photoPath,
				path      : relativePath,
				favorite  : finalNote.favorite ? 1 : 0,
				created_at: finalNote.created_at,
				updated_at: finalNote.updated_at
			})
		}
	},
	async deleteNoteFromDB(library, notePath) {
		try {
			let relativePath = path.relative(library, notePath)
			if (path.sep === '\\') {
				relativePath = relativePath.split(path.sep).join('/')
			}

			await idbCon.notes.where('path').equals(relativePath).delete()
		} catch (err) {
			log.error(err.message)
		}
	},
	async findNoteInDB(library, notePath, noteData) {
		try {
			let relativePath = path.relative(library, notePath)
			if (path.sep === '\\') {
				relativePath = relativePath.split(path.sep).join('/')
			}

			const data = await idbCon.notes.where('path').equals(relativePath).first()
			if (data) {
				let type
				switch (noteData.ext) {
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
					favorite  : data.favorite,
					path      : path.join(library, data.path),
					photo     : data.photo ? path.join(library, data.photo) : null,
					created_at: data.created_at,
					updated_at: data.updated_at,
					size      : noteData.stat.size,
					extension : noteData.ext
				}
			}
		} catch (err) {
			log.error(err.message)
		}

		return null
	},
	async cleanDatabase(library) {
		const notes = await idbCon.notes.toArray()
		let numNotes = notes.length

		log.log('Notes in DB: ' + notes.length)
		for (let i=0; i<notes.length; i++) {
			const note = notes[i]
			const notePath = path.join(library, note.path)
			if (!fs.existsSync(notePath)) {
				await idbCon.notes.where('path').equals(note.path).delete()
				numNotes--

				const imageFolder = path.join(path.dirname(notePath), '.' + path.basename(notePath, path.extname(notePath)))
				if (fs.existsSync(imageFolder)) {
					utilFile.deleteFolderRecursive(imageFolder)
				}
			}
		}

		return Promise.resolve({ num: numNotes })
	},
	async saveNote(note) {
		const res = { saved: false }
		try {
			if (note.path !== note.oldpath) {
				let num = 1
				while (num > 0) {
					if (fs.existsSync(note.path)) {
						if (note.body && note.body !== fs.readFileSync(note.path).toString()) {
							note.path = path.join(note.folder, note.filename) + num + note.extension
						} else {
							note.path = null
							break
						}
						num++
					} else {
						break
					}
				}

				if (note.path) {
					fs.writeFileSync(note.path, note.body)
					if (note.photogallery) {
						utilFile.moveFolderRecursiveSync(
							note.photogallery,
							path.dirname(note.path),
							'.' + path.basename(note.path, path.extname(note.path))
						)
					}

					res.path = note.path
					res.saved = true
				}
				return res
			}

			// same path
			if (!fs.existsSync(note.path) || (note.body.length > 0 && note.body !== fs.readFileSync(note.path).toString())) {
				fs.writeFileSync(note.path, note.body)

				res.path = note.path
				res.saved = true
			}
			return res

		} catch (e) {
			res.error = e.message
			return res
		}
	},
	async saveOutline(note) {
		const res = { saved: false }
		try {
			if (note.path !== note.oldpath) {
				let num = 1
				while (num > 0) {
					if (fs.existsSync(note.path)) {
						if (note.body && note.body !== fs.readFileSync(note.path).toString()) {
							note.path = path.join(note.folder, note.filename) + num + note.extension
						} else {
							note.path = null
							break
						}
						num++
					} else {
						break
					}
				}

				if (note.path) {
					fs.writeFileSync(note.path, note.body)
					res.path = note.path
					res.saved = true
				}
				return res
			}

			if (!fs.existsSync(note.path) || (note.body.length > 0 && note.body !== fs.readFileSync(note.path).toString())) {
				fs.writeFileSync(note.path, note.body)
				res.path = note.path
				res.saved = true
			}
			return res
		} catch (e) {
			res.error = e.message
			return res
		}
	}
}
