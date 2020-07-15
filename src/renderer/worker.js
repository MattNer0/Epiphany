import registerPromiseWorker from 'promise-worker/register'

import libraryHelper from './js/background_tasks/library'
import downloadHelper from './js/background_tasks/download'
import initialModels from './js/background_tasks/initialModels'

async function readNotesInsideFolders(library, rack, folders) {
	var arrayNotes = []
	for (const f of folders) {
		var newNotes = await libraryHelper.readNotesByFolder(library, f.path)
		var newImages = await libraryHelper.readImagesByFolder(f.path)

		var fObj = {
			notes : newNotes,
			images: newImages,
			folder: f.path,
			rack  : rack
		}
		if (f.folders) {
			fObj.subnotes = await readNotesInsideFolders(library, rack, f.folders)
		}
		arrayNotes.push(fObj)
	}
	return arrayNotes
}

function paramError(type, param) {
	return Promise.reject(new Error(`${type}: param "${param}" missing`))
}

registerPromiseWorker(({ type, data }) => {
	switch (type) {
		case 'load-racks':
			if (!data.library) return paramError(type, 'library')

			var arrayRacks = libraryHelper.readRacks(data.library)
			if (arrayRacks.length === 0) {
				initialModels.initialSetup(data.library)
				arrayRacks = libraryHelper.readRacks(data.library)
			}

			return Promise.resolve(arrayRacks)

		case 'load-folders':
			if (!data.racks) return paramError(type, 'racks')
			var arrayFolders = []
			data.racks.forEach((r) => {
				if (r._type !== 'rack') return
				var newFolders = libraryHelper.readFoldersByParent(r.path)
				arrayFolders.push({
					folders: newFolders,
					rack   : r.path
				})
			})
			return Promise.resolve(arrayFolders)

		case 'load-notes':
			if (!data.library) return paramError(type, 'library')
			if (!data.folder) return paramError(type, 'folder')

			return libraryHelper.initDB(data.library)
				.then(function() {
					return readNotesInsideFolders(data.library, data.folder.rack, data.folder.folders)
				})

		case 'cache-note':
		case 'saved-note':
			if (!data.library) return paramError(type, 'library')
			if (!data.note) return paramError(type, 'note')

			return libraryHelper.initDB(data.library)
				.then(function() {
					return libraryHelper.insertNoteInDB(data.note)
				})

		case 'cache-notes':
			if (!data.library) return paramError(type, 'library')
			if (!data.notes) return paramError(type, 'notes')

			return libraryHelper.initDB(data.library)
				.then(function() {
					return libraryHelper.insertNotesInDB(data)
				})

		case 'delete-note':
			if (!data.library) return paramError(type, 'library')
			if (!data.path) return paramError(type, 'path')

			return libraryHelper.initDB(data.library)
				.then(function() {
					return libraryHelper.deleteNoteFromDB(data.library, data.path)
				})

		case 'clean-database':
			if (!data.library) return paramError(type, 'library')

			return libraryHelper.initDB(data.library)
				.then(function() {
					return libraryHelper.cleanDatabase(data.library)
				})

		case 'download-files':
			if (!data.files) return paramError(type, 'files')
			if (!data.folder) return paramError(type, 'folder')

			return downloadHelper.downloadMultipleFiles(data.files, data.folder)

		case 'download-file':
			if (!data.file) return paramError(type, 'file')
			if (!data.folder) return paramError(type, 'folder')

			return downloadHelper.downloadFile(data.file, data.folder)

		default:
			return Promise.reject(new Error(`Type "${type}" not recognized`))
	}
})
