import fs from 'fs'
import path from 'path'

import _ from 'lodash'
import searcher from '../searcher'

import jsonDataFile from '../utils/jsonDataFile'
import utilFile from '../utils/file'

import Model from './baseModel'

var Library

class Rack extends Model {

	constructor(data) {
		super(data)

		this.ordering = data.ordering || 0
		this.name = data.name || 'Bucket' + this.ordering
		this.previousName = this.name

		this._path = data.path

		this.dragHover = false
		this.sortUpper = false
		this.sortLower = false

		this._icon = data.icon
		this.quick_notes = data.quick_notes

		this._openFolder = false

		this.hideLabel = data.hide_label || false

		this.folders = []
	}

	get data() {
		return _.assign(super.data, {
			name    : this.name,
			fsName  : this.fsName,
			ordering: this.ordering,
			path    : this._path
		})
	}

	get fsName() {
		return this.name ? this.name.replace(/[^\w. _-]/g, '') : ''
	}

	get path() {
		if (this.previousName === this.name && this._path && fs.existsSync(this._path)) {
			return this._path
		}
		var newPath = path.join(
			Library.baseLibraryPath,
			this.fsName
		)
		return newPath
	}

	set path(newValue) {
		if (newValue !== this._path) {
			this._path = newValue
		}
	}

	get allnotes() {
		var allNotes = []
		this.folders.forEach((folder) => {
			allNotes = allNotes.concat(folder.allnotes)
		})
		return allNotes
	}

	get starrednotes() {
		return this.allnotes.filter(function(obj) {
			return obj.starred
		})
	}

	get foldersWithImages() {
		var foldersImages = []
		this.folders.forEach((folder) => {
			if (folder.images.length > 0 || folder.foldersWithImages.length > 0) {
				foldersImages.push(folder)
			}
		})
		return foldersImages
	}

	searchMatchName(search) {
		let lowerSearch = search.toLowerCase()
		return this.name.toLowerCase() === lowerSearch || this.name.toLowerCase().indexOf(lowerSearch) === 0
	}

	searchnotes(search) {
		return searcher.searchNotes(search, this.allnotes)
	}

	searchstarrednotes(search) {
		return searcher.searchNotes(search, this.starrednotes)
	}

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+'/', '')
	}

	get rackExists() {
		return fs.existsSync(this._path)
	}

	get rackUid() {
		return this.uid
	}

	get extension() {
		return false
	}

	get rack() {
		return this
	}

	get openFolder() {
		return this._openFolder
	}

	set openFolder(value) {
		this._openFolder = value
	}

	get icon() {
		if (this.quick_notes) return 'file-text'
		return this._icon
	}

	hasFolder(folderName) {
		var results = this.folders.filter((f) => { return f.name === folderName })
		if (results.length > 0) return results[0]
		return null
	}

	toJSON() {
		return {
			name    : this.name,
			path    : this._path,
			ordering: this.ordering,
			folders : this.folders.map((f) => { return f.toJSON() })
		}
	}

	update(data) {
		super.update(data)
		this.name = data.name
		this.ordering = data.ordering
	}

	remove(origNotes) {
		this.folders.forEach((folder) => {
			folder.remove(origNotes)
		})
		this.removeFromStorage()
	}

	removeFromStorage() {
		if (fs.existsSync(this._path)) {
			var bucketJson = path.join(this._path, '.bucket.json')
			if (fs.existsSync(bucketJson)) fs.unlinkSync(bucketJson)
			fs.rmdirSync(this._path)
			this.uid = null
		}
	}

	saveOrdering() {
		jsonDataFile.writeKey(
			path.join(this._path, '.bucket.json'),
			'ordering',
			this.ordering
		)
	}

	saveBucketData() {
		if (this._icon === 'delete') this._icon = undefined
		jsonDataFile.writeMultipleKeys(
			path.join(this._path, '.bucket.json'),
			['ordering', 'hidelabel', 'icon'],
			[this.ordering, this.hideLabel, this._icon]
		)
	}

	saveModel() {
		if (!this.name || !this.uid || this.name.length === 0) {
			return
		}

		var newPath = this.path
		if (newPath !== this._path || !fs.existsSync(newPath)) {
			try {
				if (this._path && fs.existsSync(this._path)) {
					utilFile.moveFolderRecursiveSync(this._path, Library.baseLibraryPath, this.fsName)
				} else {
					fs.mkdirSync(newPath)
				}
				this.path = newPath
			} catch (e) {
				return console.error(e)
			}
		}
		this.saveBucketData()
		this.previousName = this.name
	}
}

export default function(library) {
	Library = library
	return { Rack: Rack }
}
