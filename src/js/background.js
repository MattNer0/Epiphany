import { ipcRenderer } from "electron";

import downloadHelper from "./background_tasks/download";
import libraryHelper from "./background_tasks/library";
import initialModels from "./background_tasks/initialModels";

/**
 * @function logError
 * @param  {type} message {description}
 * @return {type} {description}
 */
function logMainProcess(message) {
	ipcRenderer.send('console', message);
}

async function readNotesInsideFolders(allNotes, allImages, library, rack, folders, db) {
	var arrayNotes = [];
	var f;

	for (f of folders) {
		var newNotes = await libraryHelper.readNotesByFolder(library, f.path, db);
		var newImages = await libraryHelper.readImagesByFolder(f.path);

		allNotes = allNotes.concat(newNotes);
		allImages = allImages.concat(newImages);

		var fObj = {
			notes: newNotes,
			images: newImages,
			folder: f.path,
			rack: rack
		};
		if (f.folders) {
			fObj.subnotes = await readNotesInsideFolders(allNotes, allImages, library, rack, f.folders, db);
		}
		arrayNotes.push(fObj);
	}
	return arrayNotes;
}

async function loadNotes(library, arrayRacks, db) {
	var allNotes = [];
	var allImages = [];
	var r;

	for (r of arrayRacks) {
		try {
			var arrayNotes = await readNotesInsideFolders(allNotes, allImages, library, r.rack, r.folders, db);
			if (arrayNotes && arrayNotes.length > 0) {
				ipcRenderer.send('loaded-notes', arrayNotes);
			}
		} catch(err) {
			logMainProcess(err.message)
		}
	}

	ipcRenderer.send('loaded-all-notes', {
		library: library,
		notes: allNotes.map((note) => {
			return note.path.replace(library + '/', '');
		}),
		images: allImages.map((img) => {
			return img.path.replace(library + '/', '');
		})
	});
}

function loadFolders(arrayRacks) {
	var arrayFolders = [];
	arrayRacks.forEach((r) => {
		if (r._type != 'rack') return;
		var newFolders = libraryHelper.readFoldersByParent(r.path);
		arrayFolders.push({
			folders: newFolders,
			rack   : r.path
		});
	});
	ipcRenderer.send('loaded-folders', arrayFolders);
	return arrayFolders;
}

window.onload = function () {
	ipcRenderer.on('download-files', (event, data) => {
		if (!data.files || !data.folder) return logMainProcess('download-files: data missing');

		try {
			downloadHelper.downloadMultipleFiles(data.files, data.folder);
		} catch(e) {
			logMainProcess(e.message);
			data.error = e.message || e;
			ipcRenderer.send('download-files-failed', data);
		}
	});

	ipcRenderer.on('load-racks', (event, data) => {
		if (!data.library) {
			logMainProcess('load-racks: library missing');
			return;
		}

		libraryHelper.initDB(data.library).then((db) => {
			var arrayRacks = libraryHelper.readRacks(data.library);
			if (arrayRacks.length == 0) {
				initialModels.initialSetup(data.library);
				arrayRacks = libraryHelper.readRacks(data.library);
			}
			ipcRenderer.send('loaded-racks', { racks: arrayRacks });
			var arrayFolders = loadFolders(arrayRacks);
			return loadNotes(data.library, arrayFolders, db);
		}).catch((err) => {
			logMainProcess(err.message);
		})
	});

	ipcRenderer.on('cache-note', (event, data) => {
		if (!data.path || !data.library) {
			logMainProcess('cache-note: path missing');
			return;
		}

		libraryHelper.initDB(data.library).then((db) => {
			return libraryHelper.insertNoteInDB(db, data)
		}).catch((err) => {
			logMainProcess(err.message);
		})
	});
};
