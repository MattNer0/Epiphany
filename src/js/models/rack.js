import fs from "fs";
import path from "path";

import _ from "lodash";
import searcher from "../searcher";

import libini from "../utils/libini";
import util_file from "../utils/file";

import Model from "./baseModel";

var Library;

class Rack extends Model {

	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';
		this.previousName = this.name;

		this.ordering = data.ordering || 0;

		this._path = data.path;

		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;

		this._icon = data.icon;
		this._hidden = data.hidden;
		this.trash_bin = data.trash_bin;
		this.quick_notes = data.quick_notes;

		this._openFolder = false;

		this.hideLabel = data.hide_label || false;

		this.folders = [];
	}

	get data() {
		return _.assign(super.data, {
			name: this.name,
			fsName: this.fsName,
			ordering: this.ordering,
			path: this._path,
		});
	}

	get fsName() {
		return this.name ? this.name.replace(/[^\w\. _-]/g, '') : "";
	}

	get path() {
		if (this.previousName == this.name && this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		var new_path = path.join(
			Library.baseLibraryPath,
			this.fsName
		);
		return new_path;
	}

	set path(newValue) {
		if (newValue != this._path) {
			this._path = newValue;
		}
	}

	get allnotes() {
		var all_notes = [];
		this.folders.forEach((folder) => {
			all_notes = all_notes.concat(folder.allnotes);
		});
		return all_notes;
	}

	get starrednotes() {
		return this.allnotes.filter(function(obj) {
			return obj.starred;
		});
	}

	get foldersWithImages() {
		var folders_images = [];
		this.folders.forEach((folder) => {
			if (folder.images.length > 0 || folder.foldersWithImages.length > 0) {
				folders_images.push(folder);
			}
		});
		return folders_images;
	}
	
	get shorten() {
		var name = this.name;
		if (this.trash_bin) name = name.toUpperCase();
		var splitName = name.replace(/[\._-]/gi, " ").trim().split(" ");
		if (splitName.length == 0) {
			return "??";
		} else if (splitName.length == 1) {
			return name.slice(0,2);
		} else {
			return splitName[0].slice(0,1)+splitName[1].slice(0,1);
		}
	}

	searchnotes(search) {
		return searcher.searchNotes(search, this.allnotes);
	}

	searchstarrednotes(search) {
		return searcher.searchNotes(search, this.starrednotes);
	}

	get hidden() {
		return this._hidden;
	}

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+'/', '');
	}

	get rackExists() {
		return fs.existsSync(this._path);
	}

	get rackUid() {
		return this.uid;
	}

	get extension() {
		return false;
	}

	get rack() {
		return this;
	}

	get openFolder() {
		return this._openFolder;
	}

	set openFolder(value) {
		this._openFolder = value;
	}

	get icon() {
		if (this.trash_bin) return 'trash-2';
		else if (this.quick_notes) return 'file-text';
		return this._icon;
	}

	hasFolder(folder_name) {
		var results = this.folders.filter((f) => { return f.name == folder_name });
		return results[0];
	}

	toJSON() {
		return {
			name: this.name,
			path: this._path,
			ordering: this.ordering,
			folders: this.folders.map((f) => { return f.toJSON(); })
		};
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.ordering = data.ordering;
	}

	remove(origNotes) {
		this.folders.forEach((folder) => {
			folder.remove(origNotes);
		});
		this.removeFromStorage();
	}

	removeFromStorage() {
		if (fs.existsSync(this._path)) {
			if( fs.existsSync(path.join(this._path, '.rack.ini')) ) fs.unlinkSync( path.join(this._path, '.rack.ini') );
			fs.rmdirSync(this._path);
			this.uid = null;
		}
	}

	saveOrdering() {
		libini.writeKeyByIni(this._path, '.rack.ini', 'ordering', this.ordering);
	}

	saveIni() {
		if (this._icon == "delete") this._icon = undefined;
		libini.writeMultipleKeysByIni(this._path, '.rack.ini', ['ordering', 'hidelabel','icon'], [this.ordering, this.hideLabel, this._icon]);
	}

	saveModel() {
		if (!this.name || !this.uid || this.name.length == 0) {
			return;
		}

		var new_path = this.path; //path.join(Library.baseLibraryPath, this.fsName);
		if (new_path != this._path || !fs.existsSync(new_path)) {
			try {
				if (this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(this._path, Library.baseLibraryPath, this.fsName);
				} else {
					fs.mkdirSync(new_path);
				}
				this.path = new_path;
			} catch(e) {
				return console.error(e);
			}
		}
		this.saveIni();
		this.previousName = this.name;
	}
}

export default function(library) {
    Library = library;
	return { Rack : Rack };
};
