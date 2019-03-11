import fs from "fs";
import path from "path";

import ini from "ini";

import { ipcRenderer } from "electron";
import Datauri from "datauri";
import sqlite from "sqlite";

import models from "../models";

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

function readIni(ini_path) {
	if (fs.existsSync(ini_path)) {
		return ini.parse(fs.readFileSync(ini_path, "utf-8"));
	}
	return {};
}

function readBucketData(bucket_path) {
	var bucket_json = path.join(bucket_path, '.bucket.json');
	var rack_old = path.join(bucket_path, '.rack.ini');
	if (fs.existsSync(rack_old)) {
		var data = readIni(rack_old);
		fs.unlinkSync(rack_old);
		fs.writeFileSync(bucket_json, JSON.stringify(data));
		return data;
	}

	return JSON.parse(fs.readFileSync(bucket_json, "utf-8"));
}

function readFolderData(folder_path) {
	var folder_json = path.join(folder_path, '.folder.json');
	var folder_old = path.join(folder_path, '.folder');

	if (fs.existsSync(folder_old)) {
		var data = {
			"ordering" : parseInt(fs.readFileSync(folder_old, "utf-8"))
		};
		fs.unlinkSync(folder_old);
		fs.writeFileSync(folder_json, JSON.stringify(data));
		return data;
	}

	return JSON.parse(fs.readFileSync(folder_json, "utf-8"));
}

export default {

	async initDB(library) {
		models.setBaseLibraryPath(library);
		var db = await sqlite.open(path.join(library,'epiphany.db'));
		await db.run('CREATE TABLE IF NOT EXISTS notes '+
			'(id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, name TEXT, photo TEXT, summary TEXT, ' +
			'updated_at INTEGER, created_at INTEGER, CONSTRAINT path_unique UNIQUE (path))');

		//var diff = new Date().getTime() - 16070400000
		//await db.run('DELETE FROM notes WHERE updated_at < ?', diff);

		return db;
	},

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
							rack_data = readBucketData(rackPath);
						} catch(err) {
							rack_data = {};
						}

						if (rack == "_quick_notes") {
							rack_data.ordering = 0;
						}

						valid_racks.push({
							_type        : 'rack',
							name         : rack,
							hidden       : rack == ".coon_trash",
							trash_bin    : rack == ".coon_trash",
							quick_notes  : rack == "_quick_notes",
							hide_label   : rack_data.hidelabel,
							ordering     : isNaN(rack_data.ordering) ? racks.length+ri+1 : parseInt(rack_data.ordering),
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
					var folder_data = {};
					try {
						folder_data = readFolderData(folderPath);
					} catch(err) {
						folder_data = {};
					}
					valid_folders.push({
						name    : folders[fi],
						ordering: folder_data.ordering ? parseInt(folder_data.ordering) : fi+1,
						path    : folderPath,
						folders : this.readFoldersByParent(folderPath)
					});
				}
			}
			return valid_folders;
		} catch(err) {
			logMainProcess(err);
			return [];
		}
	},
	async readNotesByFolder(library, folder, db) {
		if (!fs.existsSync(folder)) return [];

		var valid_notes = [];
		var notes = fs.readdirSync(folder);
		var note;

		for (note of notes) {
			var notePath = path.join(folder, note);
			var noteCache = await this.findNoteInDB(db, library, notePath)
			if (noteCache) {
				valid_notes.push(noteCache);

			} else if (fs.existsSync(notePath) && note.charAt(0) != ".") {
				var newNote = this.readNewNote(notePath);
				//var newNote = await this.insertNoteInDB(db, library, notePath)
				if (newNote) valid_notes.push(newNote);
			}
		}
		return valid_notes;
	},
	async readImagesByFolder(folder) {
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
	readNote(notePath, noteData, withBody) {
		var note = path.basename(notePath, noteData.ext);
		var body = null
		if (withBody) body = fs.readFileSync(notePath).toString();
		switch(noteData.ext) {
			case '.mdencrypted':
				return {
					type: 'encrypted',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			case '.opml':
				return {
					type: 'outline',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			default:
				return {
					type: 'note',
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
	},
	readNewNote(notePath) {
		var noteData = isValidNotePath(notePath);
		if (noteData) {
			return this.readNote(notePath, noteData, false)
		}
		return null;
	},
	async insertNoteInDB(db, finalNote) {
		var data = await db.get('SELECT * FROM notes WHERE path = ? LIMIT 1', finalNote.path)
		if (data) {
			if (data.summary !== finalNote.summary || data.name !== finalNote.name || data.updated_at !== finalNote.updated_at || data.photo !== finalNote.photo) {
				await db.run('UPDATE notes SET (name, summary, photo, created_at, updated_at) = (?, ?, ?, ?, ?) WHERE path = ?',
					[finalNote.name, finalNote.summary, finalNote.photo, finalNote.created_at, finalNote.updated_at, finalNote.path]);
			}
		} else {
			await db.run('INSERT INTO notes (name, summary, photo, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
				[finalNote.name, finalNote.summary, finalNote.photo, finalNote.path, finalNote.created_at, finalNote.updated_at]);
		}
	},
	async findNoteInDB(db, library, notePath) {
		try {
			var data = await db.get('SELECT * FROM notes WHERE path = ? LIMIT 1', path.relative(library, notePath))
			if (data) {
				var extension = path.extname(notePath);
				var type;

				switch(extension) {
					case '.mdencrypted':
						type = 'encrypted';
					case '.opml':
						type = 'outline';
					default:
						type = 'note';
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
		} catch(err) {
			logMainProcess(err.message)
		}

		return null;
	}
};
