export default {
	namespaced: true,
	state     : {
		editorRow       : 0,
		editorColumn    : 0,
		editorSelection : 0,
		editorWordscount: 0,
		editorLinebreaks: 0,
		search          : '',
		containerMargin : ''
	},
	getters: {
	},
	mutations: {
		resetEditor (state) {
			state.editorRow = 0
			state.editorColumn = 0
			state.editorSelection = 0
			state.editorWordscount = 0
			state.editorLinebreaks = 0
		},
		cursorPositon (state, { row, column }) {
			state.editorRow = row
			state.editorColumn = column
		},
		cursorSelection (state, selection) {
			state.editorSelection = selection.length
		},
		editorWordsCount (state, wordsCount) {
			state.editorWordscount = wordsCount
		},
		editorLineBreaks (state, lineBreaks) {
			state.editorLinebreaks = lineBreaks
		},
		setSearch (state, query) {
			state.search = query
		},
		resetSearch (state) {
			state.search = ''
		},
		saveContainerMargin (state, margin) {
			state.containerMargin = margin
		}
	},
	actions: {
	}
}
