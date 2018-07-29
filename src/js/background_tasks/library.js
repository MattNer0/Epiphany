import fs from "fs";
import path from "path";

import { ipcRenderer } from "electron";
import libini from "../utils/libini";
import Datauri from "datauri";

/**
 * @function logError
 * @param  {type} message {description}
 * @return {type} {description}
 */
function logMainProcess(message) {
	ipcRenderer.send('console', message);
}

function dataImage(path) {
	return Datauri.sync(path);
}

/**
 * @function getValidMarkdownFormats
 * @return {Array} Array of valid formats
 */
function getValidMarkdownFormats() {
	return ['.md', '.markdown', '.txt', '.mdencrypted', '.opml'];
}

/**
 * @function getValidImageFormats
 * @return {Array} Array of valid formats
 */
function getValidImageFormats() {
	return ['.jpg', '.jpeg', '.bmp', '.gif', '.png'];
}

/**
 * @function isValidNotePath
 * @param  {type} notePath {description}
 * @return {type} {description}
 */
function isValidNotePath(notePath) {
	var valid_formats = getValidMarkdownFormats();
	var noteStat = fs.statSync(notePath);
	var noteExt = path.extname(notePath);
	if (noteStat.isFile() && valid_formats.indexOf(noteExt) >= 0 ) {
		return {
			ext: noteExt,
			stat: noteStat
		};
	}
	return false;
}

/**
 * @function isValidImagePath
 * @param  {type} imagePath {description}
 * @return {type} {description}
 */
function isValidImagePath(imagePath) {
	var valid_formats = getValidImageFormats();
	var imageStat = fs.statSync(imagePath);
	var imageExt = path.extname(imagePath);
	if (imageStat.isFile() && valid_formats.indexOf(imageExt) >= 0 ) {
		return {
			ext: imageExt,
			stat: imageStat
		};
	}
	return false;
}



function readRackData(rack_path) {
	return libini.readIniFile(rack_path, '.rack.ini');
}

export default {

	readRacks(library) {
		var valid_racks = [];
		if (fs.existsSync(library)) {
			var racks = fs.readdirSync(library);
			for (var ri = 0; ri < racks.length; ri++) {
				var rack = racks[ri];
				var rackPath = path.join(library, rack);

				if (fs.existsSync(rackPath) && (rack.charAt(0) != "." || rack == ".coon_trash")) {
					var rackStat = fs.statSync(rackPath);
					if (rackStat.isDirectory()) {
						var rack_data = {};
						try {
							rack_data = readRackData(rackPath);
						} catch(err) {
							rack_data = {};
						}
						valid_racks.push({
							_type        : 'rack',
							name         : rack,
							hidden       : rack == ".coon_trash",
							trash_bin    : rack == ".coon_trash",
							quick_notes  : rack == "_quick_notes",
							hide_label   : rack_data.hidelabel,
							ordering     : rack_data.ordering ? parseInt(rack_data.ordering) : ri+1,
							icon         : rack_data.icon || '',
							path         : rackPath
						});
					}
				}
			}
		}
		return valid_racks;
	},
	readFoldersByParent(parent_folder) {
		try {
			var valid_folders = [];
			var folders = fs.readdirSync(parent_folder);
			folders = folders.filter(function(obj) {
				return obj.charAt(0) != ".";
			});
			for (var fi = 0; fi < folders.length; fi++) {
				var folderPath = path.join(parent_folder, folders[fi]);
				var folderStat = fs.statSync(folderPath);
				if (folderStat.isDirectory()) {
					valid_folders.push({
						name: folders[fi],
						ordering: valid_folders.length,
						load_ordering: true,
						path: folderPath,
						folders: this.readFoldersByParent(folderPath)
					});
				}
			}
			return valid_folders;
		} catch(err) {
			logMainProcess(err);
			return [];
		}
	},
	readNotesByFolder(folder) {
		if (!fs.existsSync(folder)) return [];

		var valid_notes = [];
		var notes = fs.readdirSync(folder);
		notes.forEach((note) => {
			var notePath = path.join(folder, note);
			if (fs.existsSync(notePath) && note.charAt(0) != ".") {
				var noteData = isValidNotePath(notePath);
				if (noteData) {
					valid_notes.push(this.readNote(notePath, noteData));
				}
			}
		});
		return valid_notes;
	},
	readImagesByFolder(folder) {
		if (!fs.existsSync(folder)) return [];

		var valid_images = [];
		var images = fs.readdirSync(folder);
		images.forEach((img) => {
			var imgPath = path.join(folder, img);
			if (fs.existsSync(imgPath) && img.charAt(0) != ".") {
				var imgData = isValidImagePath(imgPath);
				if (imgData) {
					valid_images.push({
						path: imgPath,
						name: img
					});
				}
			}
		});
		return valid_images;
	},
	readNote(notePath, noteData) {
		var note = path.basename(notePath);
		var body = fs.readFileSync(notePath).toString();
		switch(noteData.ext) {
			case '.mdencrypted':
				return {
					_type: 'encrypted',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			case '.opml':
				return {
					_type: 'outline',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			default:
				return {
					_type: 'note',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
		}
	},
	isNoteFile(filePath) {
		if (!filePath) return false;
		return isValidNotePath(filePath);
	}
};
