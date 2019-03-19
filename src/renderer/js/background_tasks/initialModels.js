import fs from 'fs'
import path from 'path'

/**
 * @function makeInitialNotes
 * @param  {String} folderPath Initial Folder
 * @return {Array} Array with the new Note
 */
function makeInitialNotes(folderPath) {
	var notePath = path.join(folderPath, 'Welcome.md')
	var noteBody = '# Welcome to Epiphany\n\n' +
		'* Phenomenon User Interface\n' +
		'* Beautiful highlight, comfortable completing\n\n' +
		'## Features\n\n' +
		'* Note listing as time line (updated / created)\n' +
		'* Syncing with local files\n' +
		'* Text searching\n' +
		'* Beautiful inline code highlight\n' +
		'* Comfy completing by syntax\n' +
		'* Pasting images\n' +
		'* Exporting notes'

	fs.writeFileSync(notePath, noteBody)
	return [notePath]
}

/**
 * @function makeInitialFolders
 * @param  {String} rackpath {description}
 * @return {Array} Array of folders
 */
function makeInitialFolders(rackpath) {

	var folder1Path = path.join(rackpath, 'Todo')
	if (!fs.existsSync(folder1Path)) fs.mkdirSync(folder1Path)

	var folder2Path = path.join(rackpath, 'Meeting')
	if (!fs.existsSync(folder2Path)) fs.mkdirSync(folder2Path)

	return [folder1Path, folder2Path]
}

/**
 * @function makeInitialRacks
 * @param  {String} library {description}
 * @return {Object} {description}
 */
function makeInitialRacks(library) {
	var newRackPath = path.join(library, 'Work')
	if (!fs.existsSync(newRackPath)) fs.mkdirSync(newRackPath)

	var folderPaths = makeInitialFolders(newRackPath)
	var notePaths = makeInitialNotes(folderPaths[0])

	return {
		notes  : notePaths,
		folders: folderPaths,
		rack   : newRackPath
	}
}

/**
 * @function initialSetup
 * @param  {String} library {description}
 * @return {Object} New data array
 */
function initialSetup(library) {
	return makeInitialRacks(library)
}

export default {
	makeInitialNotes  : makeInitialNotes,
	makeInitialFolders: makeInitialFolders,
	makeInitialRacks  : makeInitialRacks,
	initialSetup      : initialSetup
}
