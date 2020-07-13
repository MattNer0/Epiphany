import { ipcRenderer } from 'electron'
import downloadHelper from './js/background_tasks/download'
import libraryHelper from './js/background_tasks/library'
import initialModels from './js/background_tasks/initialModels'
import log from 'electron-log'

async function readNotesInsideFolders(allNotes, allImages, library, rack, folders, db) {
	var arrayNotes = []
	for (const f of folders) {
		var newNotes = await libraryHelper.readNotesByFolder(library, f.path, db)
		var newImages = await libraryHelper.readImagesByFolder(f.path)

		allNotes = allNotes.concat(newNotes)
		allImages = allImages.concat(newImages)

		var fObj = {
			notes : newNotes,
			images: newImages,
			folder: f.path,
			rack  : rack
		}
		if (f.folders) {
			fObj.subnotes = await readNotesInsideFolders(allNotes, allImages, library, rack, f.folders, db)
		}
		arrayNotes.push(fObj)
	}
	return arrayNotes
}

async function loadNotes(library, arrayRacks, db) {
	var allNotes = []
	var allImages = []

	for (const r of arrayRacks) {
		try {
			var arrayNotes = await readNotesInsideFolders(allNotes, allImages, library, r.rack, r.folders, db)
			if (arrayNotes && arrayNotes.length > 0) {
				ipcRenderer.send('loaded-notes', arrayNotes)
			}
		} catch (err) {
			log.error(err.message)
		}
	}

	ipcRenderer.send('loaded-all-notes', {
		library: library,
		notes  : allNotes.map((note) => {
			return note.path.replace(library + '/', '')
		}),
		images: allImages.map((img) => {
			return img.path.replace(library + '/', '')
		})
	})
}

function loadFolders(arrayRacks) {
	var arrayFolders = []
	arrayRacks.forEach((r) => {
		if (r._type !== 'rack') return
		var newFolders = libraryHelper.readFoldersByParent(r.path)
		arrayFolders.push({
			folders: newFolders,
			rack   : r.path
		})
	})
	ipcRenderer.send('loaded-folders', arrayFolders)
	return arrayFolders
}

window.onload = function () {
	ipcRenderer.on('download-files', (event, data) => {
		if (!data.files || !data.folder) return log.error('download-files: data missing')

		try {
			downloadHelper.downloadMultipleFiles(data.files, data.folder)
		} catch (err) {
			log.error(err.message)
			data.error = err.message || err
			ipcRenderer.send('download-files-failed', data)
		}
	})

	ipcRenderer.on('load-racks', (event, data) => {
		if (!data.library) {
			log.error('load-racks: library missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				var arrayRacks = libraryHelper.readRacks(data.library)
				if (arrayRacks.length === 0) {
					initialModels.initialSetup(data.library)
					arrayRacks = libraryHelper.readRacks(data.library)
				}
				ipcRenderer.send('loaded-racks', { racks: arrayRacks })
				var arrayFolders = loadFolders(arrayRacks)
				return loadNotes(data.library, arrayFolders, db)
			})
			.catch((err) => {
				log.error(err.message)
			})
	})

	ipcRenderer.on('cache-note', (event, data) => {
		if (!data.path || !data.library) {
			log.error('cache-note: path missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				return libraryHelper.insertNoteInDB(db, data)
			})
			.catch((err) => {
				log.error(err.message)
			})
	})

	ipcRenderer.on('cache-notes', (event, data) => {
		if (!data.library) {
			log.error('cache-notes: library missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				return libraryHelper.insertNotesInDB(db, data)
			})
			.catch((err) => {
				log.error(err.message)
			})
	})

	ipcRenderer.on('delete-note', (event, data) => {
		if (!data.path || !data.library) {
			log.error('delete-note: path missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				return libraryHelper.deleteNoteFromDB(db, data.library, data.path)
			})
			.catch((err) => {
				log.error(err.message)
			})
	})

	ipcRenderer.on('clean-database', (event, data) => {
		if (!data.library) {
			log.error('clean-database: library missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				return libraryHelper.cleanDatabase(db, data.library)
			})
			.then(numNotes => {
				ipcRenderer.send('database-cleaned', { num: numNotes })
			})
			.catch((err) => {
				log.error(err.message)
			})
	})

	ipcRenderer.on('saved-note', (event, data) => {
		if (!data.path || !data.library) {
			log.error('saved-note: path missing')
			return
		}

		libraryHelper.initDB(data.library)
			.then((db) => {
				return libraryHelper.insertNoteInDB(db, data)
			})
			.catch((err) => {
				log.error(err.message)
			})
	})
}
