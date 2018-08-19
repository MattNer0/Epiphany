import fs from "fs";
import path from "path";
import { ipcRenderer } from "electron";
import encrypt from "encryptjs";
import moment from "moment";
import _ from "lodash";
import arr from "../utils/arr";
import util_file from "../utils/file";
import opml from "../utils/opml";
import Model from "./baseModel";

var Library;
var Image;

class Note extends Model {
	constructor(data) {
		super(data);

		this._ext = data.extension || '.md';

		var re = new RegExp('\\' + this._ext + '$');

		this._name = data.name.replace(re, '');
		this._path = data.path;
		if (data.folder || data.rack) {
			this.rack = data.rack || data.folder.rack;
		} else {
			this.rack = null;
		}
		this.folder = data.folder;
		this.doc = null;
		this._removed = false;
		this._trashed = false;
		this._metadata = {};

		if (data.rack && data.rack.trash_bin) {
			this._trashed = true;
		}

		if (!data.body || data.body == '') {
			this._loadedBody = false;
			this._body = '';
		} else {
			this.replaceBody(data.body);
		}
	}

	get updatedAt() {
		if (!this._metadata.updatedAt) {
			this._metadata.updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
		}
		return moment(this._metadata.updatedAt);
	}

	set updatedAt(value) {
		this.setMetadata('updatedAt', value);
	}

	get createdAt() {
		return moment(this._metadata.createdAt);
	}

	set createdAt(value) {
		this.setMetadata('createdAt', value);
	}

	get starred() {
		return this._metadata.starred && this._metadata.starred == 'true';
	}

	set starred(value) {
		this.setMetadata('starred', String(value).toLowerCase());
	}

	get data() {
		return _.assign(super.data, {
			body: this._body,
			path: this._path,
			extension: this._ext,
			document_filename: this.document_filename,
			rack: this.rack,
			folder: this.folder
		});
	}

	get extension() {
		return this._ext;
	}

	get isEncrypted() {
		return false;
	}

	get isEncryptedNote() {
		return false;
	}

	get isOutline() {
		return false;
	}

	get properties() {
		return {
			lineCount: (this._body.match(/\n/g) || []).length,
			wordCount: this._body.replace(/\n/g, ' ').replace(/ +/g, ' ').split(' ').length,
			charCount: this._body.replace(/\W/g, '').length
		};
	}

	get metadataregex() {
		return /^(([+-]{3,}\n)|([a-z]+)\s?[:=]\s+['"]?([\w\W\s]+?)['"]?\s*\n(?=(\w+\s?[:=])|\n|([+-]{3,}\n)?))\n*/gmiy;
		//return /^((\+\+\++\n)|([a-z]+)\s?[:=]\s+[`'"]?([\w\W\s]+?)[`'"]?\s*\n(?=(\w+\s?[:=])|\n|(\+\+\++\n)?))\n*/gmiy;
	}

	get metadata() {
		return this._metadata;
	}

	get metadataKeys() {
		return Object.keys(this._metadata);
	}

	set metadata(newValue) {
		this._metadata = newValue;
		var str = '+++\n';
		Object.keys(newValue).forEach((key) => {
			if (newValue[key]) str += key + ' = "' + newValue[key] + '"\n';
		});
		this._body = str + '+++\n\n' + this.bodyWithoutMetadata;
	}

	set path(newValue) {
		if (!this._path || newValue != this._path) {
			try {
				util_file.deleteFile(this._path);
			} catch (e) {
				console.error(e);
			}

			var imageFolderPath = this.imagePath;

			// what if new folder already exists?
			if (imageFolderPath && imageFolderPath.length > 1 && fs.existsSync(imageFolderPath)) {
				util_file.moveFolderRecursiveSync(
					imageFolderPath,
					path.dirname(newValue),
					'.' + path.basename(newValue, path.extname(newValue))
				);
			}

			this._path = newValue;
		}
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		var new_path = path.join(
			this.folder.path,
			this.document_filename
		) + this._ext;
		return new_path;
	}

	get imagePath() {
		if (this._path) {
			return path.join(path.dirname(this._path), '.' + path.basename(this._path, path.extname(this._path)));
		}
		return '';
	}

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+"/", "");
	}

	get relativePathNoFileName() {
		return this.relativePath.replace("/"+path.basename(this._path), " ").replace(/\//g,"/\n");
	}

	get document_filename() {
		if (this._trashed) {
			return util_file.cleanFileName(this._name);
		}
		return this.title ? util_file.cleanFileName(this.title) : "";
	}

	get body() {
		return this._body;
	}

	set body(newValue) {
		if (newValue != this._body) {
			if (!this._metadata.createdAt) this._metadata.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
			this._metadata.updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
			this._body = newValue;
		}
	}

	get bodyWithoutMetadata() {
		return this._body.replace(this.metadataregex, '').replace(/^\n+/, '');
	}

	get bodyWithoutTitle() {
		if (this.body) {
			return this.cleanPreviewBody(this.splitTitleFromBody().body);
		}
		return '';
	}

	get title() {
		if (this.body) {
			return this.splitTitleFromBody().title || this._name;
		}
		return this._name;
	}

	set title(newValue) {
		this._name = newValue;
	}

	get bodyWithDataURL() {
		var body = this.body;

		body = body.replace(
			/!\[(.*?)]\((epiphany:\/\/.*?)\)/mg,
			(match, p1, p2) => {
				var dataURL;
				try {
					dataURL = new Image(p2, path.basename(p2), this).makeAbsolutePath();
				} catch (e) {
					console.warn(e);
					return match;
				}
				return '![' + p1 + '](' + dataURL + ')';
			}
		);

		body = body.replace(
			/^\[([\w\d]+)]:\s(epiphany:\/\/.*?)$/mg,
			(match, p1, p2) => {
				var dataURL;
				try {
					dataURL = new Image(p2, path.basename(p2), this).makeAbsolutePath();
				} catch (e) {
					console.warn(e);
					return match;
				}
				return '[' + p1 + ']: ' + dataURL;
			}
		);
		return body;
	}

	get bodyWithMetadata() {
		if (this._body) {
			var str = '+++\n';
			Object.keys(this._metadata).forEach((key) => {
				if (this._metadata[key]) str += key + ' = "' + this._metadata[key] + '"\n';
			});
			return str + '+++\n\n' + this._body.replace(/[\t ]?(\r\n|\r|\n)/g,'\n');
		}
		return '';
	}

	get img() {
		var matched = (/(https?|epiphany|coonpad|pilemd):\/\/[-a-zA-Z0-9@:%_+.~#?&//=]+?\.(png|jpeg|jpg|gif)/).exec(this.body);
		if (!matched) {
			return null;
		} else if (matched[1] == 'http' || matched[1] == 'https') {
			return matched[0];
		}
		var dataUrl;
		try {
			dataUrl = new Image(matched[0], path.basename(matched[0]), this).makeAbsolutePath();
		} catch (e) {
			dataUrl = null;
		}
		return dataUrl;
	}

	toJSON() {
		return {
			extension: this._ext,
			name: this._name,
			body: this._body,
			path: this._path,
			folder: this.folder.path,
			rack: this.rack.path
		};
	}

	downloadImages() {
		var createdDir = false;
		var imageFormats = ['.png', '.jpg', '.gif', '.bmp'];

		var urlDownloads = [];
		var replacedStrings = [];

		this.body = this.body.replace(/coonpad:\/\//mg,"epiphany://");
		this.body = this.body.replace(/pilemd:\/\//mg,"epiphany://");
		this.body = this.body.replace(
			/!\[(.*?)]\((https?:\/\/.*?)\)/img,
			(match, p1, p2) => {
				var file_data = util_file.getFileDataFromUrl(p2);
				if (file_data.extname && imageFormats.indexOf(file_data.extname) >= 0) {
					if (!createdDir) {
						try {
							fs.mkdirSync(this.imagePath);
						} catch (e) {
							// directory exists
						}
						createdDir = true;
					}
					var newStr = '![' + p1 + '](epiphany://' + file_data.cleanname + ')';
					try {
						if (urlDownloads.indexOf(p2) == -1) {
							urlDownloads.push(p2);
							replacedStrings.push({
								original: match,
								new: newStr
							});
						}
					} catch (e) {
						console.warn(e);
						return match;
					}

					return newStr;
				}
				return match;
			}
		);

		this.body = this.body.replace(
			/^\[(\d+)\]:\s(https?:\/\/.*?$)/img,
			(match, p1, p2) => {
				var file_data = util_file.getFileDataFromUrl(p2);
				if (file_data.extname && imageFormats.indexOf(file_data.extname) >= 0) {
					if (!createdDir) {
						try {
							fs.mkdirSync(this.imagePath);
						} catch (e) {
							// directory exists
						}
						createdDir = true;
					}
					var newStr = '[' + p1 + ']: epiphany://' + file_data.cleanname;
					try {
						if (urlDownloads.indexOf(p2) == -1) {
							urlDownloads.push(p2);
							replacedStrings.push({
								original: match,
								new: newStr
							});
						}
					} catch (e) {
						console.warn(e);
						return match;
					}

					return newStr;
				}
				return match;
			}
		);

		if (urlDownloads.length > 0) {
			ipcRenderer.send('download-files', {
				files: urlDownloads,
				replaced: replacedStrings,
				note: this.path,
				folder: this.imagePath
			});
		}
	}

	setMetadata(key, value) {
		if (key) this._metadata[key] = value;
	}

	isFolder(f) {
		return this.folder.uid == f.uid;
	}

	isRack(r) {
		return this.folder.rack.uid == r.uid;
	}

	parseMetadata() {
		var re = this.metadataregex;
		var metadata = {};
		var m;

		/**
		 * @function cleanMatch
		 * @param  {type} m {description}
		 * @return {type} {description}
		 */
		function cleanMatch(m) {
			if (!m) return m;
			var newM = [];
			for (var i = 1; i < m.length; i++) {
				if(m[i]) {
					newM.push(m[i]);
				}
			}
			return newM;
		}

		var first_meta = this._body.match(re);
		if (first_meta && this._body.indexOf(first_meta[0]) == 0) {
			do {
				m = re.exec(this._body);
				m = cleanMatch(m);
				if (m && m[1].match(/^\+\+\++/)) {
					// +++
				} else if (m) {
					m[2] = m[2].replace(/\s+/g,' ');
					if (m[1] === 'updatedAt' || m[1] === 'createdAt') {
						metadata[m[1]] = moment(m[2]).format('YYYY-MM-DD HH:mm:ss');
					} else {
						metadata[m[1]] = m[2];
					}
				}
			} while (m);
			this._metadata = metadata;
			this._body = this.bodyWithoutMetadata;
		}

		if (!this._metadata.createdAt || !this._metadata.updatedAt) {
			this.initializeCreationDate();
		}
	}

	loadBody() {
		if (this._loadedBody) return;

		if (fs.existsSync(this.path)) {
			var content = fs.readFileSync(this.path).toString();
			if (content && content != this._body) {
				this.replaceBody(content);
			}
			this._loadedBody = true;
		}
	}

	replaceBody(new_body) {
		this._body = new_body;

		if (!this.isEncryptedNote && !this.isOutline) {
			this.parseMetadata();
			this.downloadImages();
		}
		this._loadedBody = true;
	}

	initializeCreationDate() {
		var noteStat = fs.statSync(this._path);
		if (noteStat) {
			if (!this._metadata.createdAt) {
				this._metadata.createdAt = moment(noteStat.birthtime).format('YYYY-MM-DD HH:mm:ss');
			}
			if (!this._metadata.updatedAt) {
				this._metadata.updatedAt = moment(noteStat.mtime).format('YYYY-MM-DD HH:mm:ss');
			}
		}
		this.saveModel();
	}

	update(data) {
		super.update(data);
		this._body = data.body;
	}

	splitTitleFromBody() {
		var ret;
		var lines = this.bodyWithoutMetadata.split('\n');
		lines.forEach((row, index) => {
			if (ret) {
				return;
			}
			if (row.length > 0) {
				ret = {
					title: _.trimStart(row, '# '),
					meta: this._metadata,
					body: lines.slice(0, index).concat(lines.splice(index + 1)).join('\n')
				};
			}
		});

		if (ret) return ret;

		return {
			title: '',
			meta: this._metadata,
			body: this.body
		};
	}

	cleanPreviewBody(text) {
		text = text.replace(/^\n/, '');
		text = text.replace(/\* \[ \]/g, '* ');
		text = text.replace(/\* \[x\]/g, '* ');
		return text;
	}

	saveModel() {
		if(this._removed) return;

		var body = this.bodyWithMetadata;
		if (this.isEncryptedNote) {
			if (this._encrypted) return { error: "Encrypted" };
			body = this.encrypt();
		}

		var outer_folder;
		if (this.rack && this.folder) {
			outer_folder = this.folder.path;
		} else {
			outer_folder = path.dirname(this._path);
		}

		if (body.length == 0) {
			return { saved: true };
		}

		if (this.document_filename) {
			var new_path = path.join(outer_folder, this.document_filename) + this._ext;

			try {
				// new path
				if (new_path != this._path) {
					var num = 1;
					while (num > 0) {
						if (fs.existsSync(new_path)) {
							if (body && body != fs.readFileSync(new_path).toString()) {
								new_path = path.join(outer_folder, this.document_filename)+num+this._ext;
							} else {
								new_path = null;
								break;
							}
							num++;
						} else {
							break;
						}
					}
	
					if (new_path) {
						fs.writeFileSync(new_path, body);
						util_file.moveFolderRecursiveSync(
							this.imagePath,
							path.dirname(new_path),
							'.' + path.basename(new_path, path.extname(new_path))
						);
						this.path = new_path;
						return { saved: true };
					}
					return { saved: false };
				}

				// same path
				if (!fs.existsSync(new_path) || (body.length > 0 && body != fs.readFileSync(new_path).toString())) {
					fs.writeFileSync(new_path, body);
					this.path = new_path;
					return { saved: true };
				}
				return { saved: false };
			} catch(e) {
				console.warn('Couldn\'t save the note. Permission Error');
				return {
					error: 'Permission Error',
					path: new_path
				};
			}
		}
	}

	remove() {
		if (this._trashed) {
			util_file.deleteFile(this._path);
			this._removed = true;
			return false;
		} else {
			// move to trash bin
			var imgDir = this.imagePath;
			if (imgDir) util_file.deleteFolderRecursive(imgDir);
			this._trashed = true;
			this._removed = false;
			return true;
		}
	}

	static latestUpdatedNote(notes) {
		return _.max(notes, function(n) {
			return n.updatedAt;
		});
	}

	static beforeNote(notes, note, property) {
		var sorted = arr.sortBy(notes, property);
		var before = sorted[sorted.indexOf(note)+1];
		if (!before) {
			// the note was latest one;
			return sorted.slice(-2)[0];
		}
		return before;
	}

	static newEmptyNote(folder) {
		if (folder) {
			return new Note({
				name: "NewNote",
				body: "",
				path: "",
				folder: folder
			});
		}
		return false;
	}
}

class EncryptedNote extends Note {
	constructor(data) {
		super(data);
		this._ext = '.mdencrypted';
		this._encrypted = true;
		this._secretkey = null;
		this._descrypted_title = '';
	}

	get isEncrypted() {
		return this._encrypted;
	}

	get isEncryptedNote() {
		return true;
	}

	get title() {
		return this._descrypted_title || this._name;
	}

	get verifyString() {
		return 'sQhjzdTyiedGjqoCSbtft25da6W2zTpN22dH3wvKSzwxZNTfVV';
	}

	decrypt(secretkey) {
		if (!secretkey && !this._secretkey) return { error: 'Secret Key missing' };

		if (this._encrypted) {
			if(secretkey) this._secretkey = secretkey;
			if(this._body && this._body.length > 0) {
				var descrypted_body = encrypt.decrypt(this._body, this._secretkey, 256);
				if(descrypted_body.indexOf(this.verifyString) == 0) {
					descrypted_body = descrypted_body.replace(this.verifyString,'');
					this._body = descrypted_body;
					this._descrypted_title = this.splitTitleFromBody().title;
				} else {
					this._secretkey = null;
					return { error: 'Secret Key was not correct' };
				}
			}
			this._encrypted = false;
			return true;
		}

		return { error: 'Note was not encrypted' };
	}

	encrypt(secretkey) {
		if(this._encrypted) {
			return this._body;
		} else if(this._body && this._body.length > 0) {
			this._descrypted_title = this.splitTitleFromBody().title;
			if(secretkey) this._secretkey = secretkey;
			var encrypt_body = encrypt.encrypt(this.verifyString+this._body, this._secretkey, 256);
			return encrypt_body;
		}
		return '';
	}

	static newEmptyNote(folder) {
		if (folder) {
			return new EncryptedNote({
				name: 'NewNote',
				body: '',
				path: '',
				folder: folder
			});
		}
		return false;
	}
}

class Outline extends Note {
	constructor(data) {
		super(data);
		this._ext = '.opml';
		this._nodes = data.nodes ? data.nodes : [];
		this._snapshots = [];

		if (this._loadedBody) {
			this.parseOutlineBody();
		}
	}

	get title() {
		return this._name;
	}

	set title(value) {
		this._name = value;
	}

	set metadata(newValue) {
		this._metadata = newValue;
	}

	set nodes(newValue) {
		this._nodes = newValue;
	}
	
	get nodes() {
		return this._nodes;
	}

	get isOutline() {
		return true;
	}

	get bodyWithoutMetadata() {
		var bodyString = "";

		// only preview first level of the outline if length is greater than 1
		for (var i = 0; i < this._nodes.length; i++) {
			bodyString += '- ' + this._nodes[i].title + '\n' + this._nodes[i].prettifyBody(1);
			if (i < this._nodes.length - 1) bodyString += '\n';
		}
		return bodyString.trim();
	}

	get bodyWithMetadata() {
		return this._body;
	}

	downloadImages() {
		return;
	}

	splitTitleFromBody() {
		return {
			title: this._name,
			meta: this._metadata,
			body: this.bodyWithoutMetadata
		};
	}

	get properties() {
		var nodesNumber = 0;
		for (var i=0; i<this._nodes.length; i++) {
			nodesNumber += this._nodes[i].countNodes();
		}
		return {
			nodeCount: nodesNumber
		};
	}

	parseOutlineBody() {
		console.log('parse!');
		opml.parseFile(this._body, this);
	}

	compileOutlineBody() {
		return opml.stringify(this._name, this._metadata, this._nodes);
	}

	saveModel() {
		if(this._removed) return;

		var body = this.compileOutlineBody();

		var active_nodes = this._nodes.filter(function(obj) {
			return obj.title && obj.title != '';
		});

		if (active_nodes.length == 0) {
			return { saved: true };
		}

		var outer_folder;
		if (this.rack && this.folder) {
			outer_folder = path.join( Library.baseLibraryPath, this.rack.data.fsName, this.folder.data.fsName );
		} else {
			outer_folder = path.dirname(this._path);
		}

		if (this.document_filename) {
			var new_path = path.join(outer_folder, this.document_filename) + this._ext;

			if (new_path != this._path) {
				var num = 1;
				while (num > 0) {
					if (fs.existsSync(new_path)) {
						if (body && body != fs.readFileSync(new_path).toString()) {
							new_path = path.join(outer_folder, this.document_filename)+num+this._ext;
						} else {
							new_path = null;
							break;
						}
						num++;
					} else {
						break;
					}
				}

				if (new_path) {
					fs.writeFileSync(new_path, body);
					this.path = new_path;
					if (this._body) this._snapshots.push(this._body);
					this._body = body;
					return { saved: true };
				}
				return { saved: false };
			}

			try {
				if (!fs.existsSync(new_path) || (body.length > 0 && body != fs.readFileSync(new_path).toString())) {
					fs.writeFileSync(new_path, body);
					this.path = new_path;
					if (this._body) this._snapshots.push(this._body);
					this._body = body;
					return { saved: true };
				}
				return { saved: false };
			} catch(e) {
				console.warn('Couldn\'t save the note. Permission Error');
				return {
					error: 'Permission Error',
					path : new_path
				};
			}
		}
	}

	newEmptyNode(previus_node, mod) {
		var n = new OutNode({
			outline: this,
			title  : '',
			content: ''
		});
		if (!mod) mod = 0;
		if (previus_node && typeof previus_node == 'boolean') {
			this._nodes.splice(0, 0, n);
		} else if (previus_node) {
			var i = this._nodes.indexOf(previus_node);
			this._nodes.splice(i+1+mod, 0, n);
		} else {
			this._nodes.push(n);
		}
		return n;
	}

	addChild(child, previus) {
		if (previus) {
			var i = this._nodes.indexOf(previus);
			this._nodes.splice(i+1, 0, child);
		} else {
			this._nodes.push(child);
		}
		child.parentNode.removeNode(child);
		child.parent = undefined;
	}

	removeNode(node) {
		var i = this._nodes.indexOf(node);
		this._nodes.splice(i, 1);
		if (i > 0) return this._nodes[i-1];
	}

	newNode(node) {
		if (node instanceof OutNode) {
			this._nodes.push(node);
		}
	}

	generateNewNode(title, content, children) {
		var newNode = new OutNode({
			outline : this,
			title   : title,
			content : content,
			children: children
		});
		if (children && children.length > 0) newNode.updateChildrens();
		return newNode;
	}

	static newEmptyOutline(folder) {
		if (folder) {
			var out = new Outline({
				name     : 'NewOutline',
				body     : '',
				path     : '',
				folder   : folder
			});
			out.newEmptyNode();
			return out;
		}
		return false;
	}
}

class OutNode extends Model {
	constructor(data) {
		super(data);
		this._outline = data.outline;
		this._parent_node = data.parent;
		this._title = data.title;
		this._content = data.content;
		this._children = data.children ? data.children : [];
	}

	get title() {
		return this._title;
	}

	set title(newValue) {
		this._title = newValue;
	}

	get content() {
		return this._content;
	}

	set content(newValue) {
		this._content = newValue;
	}

	get children() {
		return this._children;
	}

	getChildAt(num) {
		return this._children[num];
	}

	updateChildrens() {
		for (var i=0; i<this._children.length; i++) {
			this._children[i].parent = this;
		}
	}

	set parent(newValue) {
		this._parent_node = newValue;
	}

	get parent() {
		return this._parent_node;
	}

	get parentNode() {
		return this._parent_node || this._outline;
	}

	get outline() {
		return this._outline;
	}

	prettifyBody(nest_level) {
		var bodyString = "";

		// only preview first level of the outline if length is greater than 1
		for (var i = 0; i < this._children.length; i++) {
			bodyString += Array(nest_level+1).join('\t') + '- ' + this._children[i].title;
			if (this._children[i].content) {
				bodyString += '\n' + Array(nest_level+1).join('\t') + '  ';
				bodyString += this._children[i].content.replace(/\n/g, '\n'+Array(nest_level+1).join('\t')+ '  ');
			}
			var nestedString = this._children[i].prettifyBody(nest_level+1);
			if (nestedString) bodyString += '\n' + nestedString;
			if (i < this._children.length - 1) bodyString += '\n';
		}
		return bodyString.replace(/[\s\r\n]+$/, '');
	}

	countNodes() {
		var nodesNumber = 1;
		for (var i=0; i<this._children.length; i++) {
			nodesNumber += this.getChildAt(i).countNodes();
		}
		return nodesNumber;
	}

	newEmptyNode(previus_node, mod) {
		var n = new OutNode({
			outline: this._outline,
			parent: this,
			title  : '',
			content: ''
		});
		if (!mod) mod = 0;
		if (previus_node && typeof previus_node == 'boolean') {
			this._children.splice(0, 0, n);
		} else if (previus_node) {
			var i = this._children.indexOf(previus_node);
			this._children.splice(i+1+mod, 0, n);
		} else {
			this._children.push(n);
		}
		return n;
	}

	addChild(child, previus) {
		if (previus) {
			var i = this._children.indexOf(previus);
			this._children.splice(i+1, 0, child);
		} else {
			this._children.push(child);
		}
		child.parentNode.removeNode(child);
		child.parent = this;
	}

	removeNode(node) {
		var i = this._children.indexOf(node);
		this._children.splice(i, 1);
		if (i > 0) return this._children[i-1];
		return this;
	}

	static newEmptyNode(outline, parent) {
		if (outline) {
			return new OutNode({
				outline: outline,
				parent: parent,
				title: "",
				content: "",
				icon: ""
			});
		}
		return false;
	}
}

import ImageBldr from "./image";

export default function(library) {
	Library = library;
	Image = ImageBldr(library);
	return {
		Note         : Note,
		EncryptedNote: EncryptedNote,
		Outline: Outline,
		OutNode: OutNode
	};
};
