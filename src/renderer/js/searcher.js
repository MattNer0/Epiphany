import _ from "lodash";
import models from "./models";

/**
 * @function allWords
 * @param  {String} text  The Text
 * @param  {Array} words  Array of words
 * @return {Boolean} True if all words are inside the text
 */
function allWords(text, words) {
	/*
	 * allWords("Hello Goodbye", ["ell", "oo"]) => true
	 * allWords("Hi Goodbye", ["ell", "oo"]) => false
	 */
	return _.every(_.map(words, (word) => {
		return _.includes(text, word);
	}));
}

export default {
	/**
	 * @function searchNotes
	 * @param {Object} selectedRackOrFolder Current selected rack or folder
	 * @param {String} searchInput Search string
	 * @param {Array} notes Array of notes
	 * @return {Array} Filtered notes using search input
	 */
	searchNotes(searchInput, notes) {
		if (!searchInput) return notes;
		var searchPayload = this.calculateSearchMeaning(searchInput);
		var filteredNotes = notes.filter((note) => {
			if (searchPayload.words.length == 0) return true;
			if (!note.body && note.loadBody) note.loadBody();
			if (note.body && allWords(note.body.toLowerCase(), searchPayload.words)) return true;
			return false;
		});
		return filteredNotes;
	},

	/**
	 * @function calculateSearchMeaning
	 * @param {String} searchInput Search string
	 * @return {Object} Search payload with list of folder uids and list of words in search string
	 */
	calculateSearchMeaning(searchInput) {
		if (!searchInput) {
			return { words: [] };
		}

		var words = searchInput.toLowerCase().split(' ');
		words = words.filter(function(str) {
			return str.length > 0;
		});
		return { words: words };
	}
};
