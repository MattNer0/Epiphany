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

/**
 * @function loadNotes
 * @param  {type} library {description}
 * @param  {type} arrayRacks {description}
 * @return {type} {description}
 */
function loadNotes(library, arrayRacks) {
	var allNotes = [];
	var allImages = [];

	function readNotesInsideFolders(rack, folders) {
		var arrayNotes = [];
		folders.forEach((f) => {
			var newNotes = libraryHelper.readNotesByFolder(f.path);
			var newImages = libraryHelper.readImagesByFolder(f.path);

			allNotes = allNotes.concat(newNotes);
			allImages = allImages.concat(newImages);

			var fObj = {
				notes: newNotes,
				images: newImages,
				folder: f.path,
				rack: rack
			};
			if (f.folders) {
				fObj.subnotes = readNotesInsideFolders(rack, f.folders);
			}
			arrayNotes.push(fObj);
		});
		return arrayNotes;
	}

	arrayRacks.forEach((r) => {
		var arrayNotes = readNotesInsideFolders(r.rack, r.folders);
		if (arrayNotes && arrayNotes.length > 0) {
			ipcRenderer.send('loaded-notes', arrayNotes);
		}
	});
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

/**
 * @function loadFolders
 * @param  {type} library {description}
 * @param  {type} arrayRacks {description}
 * @return {type} {description}
 */
function loadFolders(library, arrayRacks) {
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
	loadNotes(library, arrayFolders);
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
		if (!data.library) return logMainProcess('load-racks: library missing');

		try {
			var arrayRacks = libraryHelper.readRacks(data.library);
			if (arrayRacks.length == 0) {
				initialModels.initialSetup(data.library);
				arrayRacks = libraryHelper.readRacks(data.library);
			}
			ipcRenderer.send('loaded-racks', { racks: arrayRacks });
			loadFolders(data.library, arrayRacks);
		} catch(e) {
			logMainProcess(e.message);
		}
	});
};
