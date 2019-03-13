import { clipboard } from "electron";
import _ from "lodash";
const Image = require('../models').Image;
const temp_IMAGE_TAG = _.template('![<%- filename %>](<%- fileurl %>)\n');

/**
 * @function flashSelection
 * @param  {Object} cm CodeMirror Instance
 * @return {type} {description}
 */
function flashSelection(cm) {
	cm.setExtending(false);
	cm.setCursor(cm.getCursor());
}

/**
 * @function killLine
 * @param  {Object} cm CodeMirror Instance
 * @return {type} {description}
 */
function killLine(cm) {
	flashSelection(cm);
	var c = cm.getCursor();
	var thisLine = cm.getRange(c, {
		line: c.line + 1,
		ch: 0
	});
	if (thisLine == '\n') {
		clipboard.writeText('\n');
		cm.replaceRange('', c, {
			line: c.line + 1,
			ch: 0
		});
	} else {
		clipboard.writeText(cm.getRange(c, { line: c.line }));
		cm.replaceRange('', c, { line: c.line });
	}
}

/**
 * @function copyText
 * @param  {Object} cm CodeMirror instance
 * @return {type} {description}
 * 
 * Copies the current selected text into clipboard.
 */
function copyText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
	}
}

/**
 * @function cutText
 * @param  {Object} cm CodeMirror instance
 * @return {type} {description}
 * 
 * Cuts the current selected text into clipboard.
 */
function cutText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
		cm.replaceSelection('');
	}
}

/**
 * @function isImage
 * @param  {String} text {description}
 * @return {Boolean} {description}
 * 
 * check if the string contains an image url.
 * only cares about '.png' and '.jpg' extensions
 */
function isImage(text) {
	return text.split('.').pop() === 'png' || text.split('.').pop() === 'jpg';
}

/**
 * @function isCheckbox
 * @param  {String} text {description}
 * @return {type} {description}
 * 
 * Check if the string contains a markdown checkbox
 */
function isCheckbox(text) {
	return text.match(/^\* \[[x ]\] .*/g);
}

/**
 * @function uploadFile
 * @param   {Object}   cm    The CodeMirror instance
 * @param   {Object}   file  The file to upload
 * @param   {Object}   selectedNote  Current selected Note
 * @return  {Boolean}        True if file was uploaded correctly, False otherwise
 * 
 * upload image file into library directory.
 */
function uploadFile(cm, file, selectedNote) {
	var image;
	try {
		image = Image.fromBinary(file.name, file.path, selectedNote);
	} catch (err) {
		console.warn('uploadFile', err);
		return false;
	}

	cm.doc.replaceRange(
		temp_IMAGE_TAG({
			filename: file.name,
			fileurl: image.coonURL
		}),
		cm.doc.getCursor()
	);
	return true;
}

/**
 * @function pasteText
 * @param  {Object}   cm  CodeMirror instance
 * @param   {Object}  selectedNote  Current selected Note
 * @return {type} {description}
 * 
 * Handles pasting text into the editor
 */
function pasteText(cm, selectedNote) {
	if (clipboard.availableFormats().indexOf('image/png') != -1 || clipboard.availableFormats().indexOf('image/jpg') != -1) {
		var im = clipboard.readImage();
		var image = Image.fromClipboard(im, selectedNote);
		cm.doc.replaceRange(
			temp_IMAGE_TAG({
				filename: image.name,
				fileurl: image.coonURL
			}),
			cm.doc.getCursor()
		);
	} else {
		var pasted = clipboard.readText();
		if (pasted.indexOf('http') == 0) {
			pasted = pasted.replace(new RegExp('(.jpg|.png)[?&].*$'), '$1');
		}
		if (isImage(pasted)) {
			var f = {
				name: pasted.split('/').pop(),
				path: pasted
			};
			if (!uploadFile(cm, f, selectedNote)) cm.replaceSelection(pasted);
		} else if (isCheckbox(pasted)) {
			var c = cm.getCursor();
			var thisLine = cm.getLine(c.line);
			if (isCheckbox(thisLine)) {
				cm.replaceSelection(pasted.replace(/^\* \[[x ]\] /g, ''));
			} else {
				cm.replaceSelection(pasted);
			}
		} else {
			cm.replaceSelection(pasted);
		}
	}
}

/**
 * @function selectAllText
 * @param  {Object} cm CodeMirror instance
 * @return {type} {description}
 * 
 * select all text in the editor.
 */
function selectAllText(cm) {
	cm.execCommand('selectAll');
}

export { killLine, copyText, cutText, pasteText, selectAllText };
