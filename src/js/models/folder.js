import fs from "fs";
import path from "path";
import searcher from "../searcher";
import jsonDataFile from "../utils/jsonDataFile";
import util_file from "../utils/file";
import Model from "./baseModel";

var Library;

class Folder extends Model {
	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';
		this.ordering = data.ordering || 0;

		this.rack = data.rack;
		this.parentFolder = data.parentFolder;
		this._path = data.path || '';

		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;

		this.openNotes = false;
		this._openFolder = false;

		this.folders = [];
		if (data.folders && data.folders.length > 0) {
			for (var fi = 0; fi < data.folders.length; fi++) {
				var fObj = data.folders[fi];
				fObj.rack = this.rack;
				fObj.parentFolder = this;
				this.folders.push(new Folder(fObj));
			}
		}
		this._notes = [];
		this._images = [];
	}

	remove(origNotes) {
		origNotes.forEach((note) => {
			if (note.folder.uid && note.folder.uid == this.uid) {
				note.remove();
			}
		});
		Folder.removeModelFromStorage(this);
	}

	get data() {
		return {
			uid: this.uid,
			name: this.name,
			fsName: this.fsName,
			ordering: this.ordering,
			rack: this.rack,
			path: this._path
		};
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		return path.join(
			this.parent.path,
			this.fsName
		);
	}

	get fsName() {
		return this.name ? this.name.replace(/[^\w\. _-]/g, '') : '';
	}

	set path(newValue) {
		if (newValue != this._path) {
			this._path = newValue;
		}
	}

	get folderExists() {
		return fs.existsSync(this._path);
	}

	get allnotes() {
		var all_notes = this.notes.slice();
		this.folders.forEach((folder) => {
			all_notes = all_notes.concat(folder.allnotes);
		});
		return all_notes;
	}

	get allimages() {
		var all_images = this.images.slice();
		this.folders.forEach((folder) => {
			all_images = all_images.concat(folder.allimages);
		});
		return all_images;
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

	searchnotes(search) {
		return searcher.searchNotes(search, this.allnotes);
	}

	set parent(f) {
		if (!f) {
			return;
		}

		if (f.folderExists) {
			this.parentFolder = f;
		}
	}

	get parent() {
		return this.parentFolder || this.rack;
	}

	set notes(notes_list) {
		this._notes = notes_list;
	}

	get notes() {
		return this._notes;
	}

	set images(images_list) {
		this._images = images_list;
	}

	get images() {
		return this._images;
	}

	get rackUid() {
		return this.rack.uid;
	}

	get openFolder() {
		return this._openFolder;
	}

	set openFolder(value) {
		this._openFolder = value;
		if (value) this.parent.openFolder = true;
	}

	toJSON() {
		return {
			name: this.name,
			path: this._path,
			rack: this.rack,
			ordering: this.ordering,
			notes: this._notes.map((n) => { return n.toJSON(); })
		};
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.ordering = data.ordering;
	}

	saveOrdering() {
		jsonDataFile.writeKey(
			path.join(this._path, '.folder.json'),
			'ordering',
			this.ordering
		);
	}

	saveModel() {
		if (!this.name || !this.uid) {
			return;
		}

		var new_path = path.join(this.parent.path, this.fsName);
		if (new_path != this._path || !fs.existsSync(new_path)) {
			try {
				if (this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(
						this._path,
						this.parent.path,
						this.fsName
					);
				} else {
					fs.mkdirSync(new_path);
				}
				this.path = new_path;
			} catch(e){
				return console.error(e);
			}
		}
		this.saveOrdering();
	}

	static removeModelFromStorage(model) {
		if (!model) {
			return;
		}
		if (fs.existsSync(model.data.path)) {
			var folder_json = path.join(model.data.path, '.folder.json');
			if (fs.existsSync(folder_json)) fs.unlinkSync(folder_json);
			fs.rmdirSync(model.data.path);
			model.uid = null;
		}
	}
}

export default function(library) {
	Library = library;
	return { Folder : Folder };
};
