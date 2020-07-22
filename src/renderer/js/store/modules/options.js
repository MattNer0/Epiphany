export default {
	namespaced: true,
	state     : {
		notesDisplayOrder: 'updatedAt',
		fontsize         : 15,
		isPreview        : false,
		isFullWidthNote  : false,
		isFullScreen     : false,
		useMonospace     : false,
		reduceToTray     : true,
		isToolbarEnabled : true
	},
	getters: {
	},
	mutations: {
		setFullWidthNote (state, val) {
			state.isFullWidthNote = val
		},
		setToolbarEnabled (state, val) {
			state.isToolbarEnabled = val
		},
		setNotesDisplayOrder (state, val) {
			if (val === 'updatedAt' || val === 'createdAt' || val === 'title') {
				state.notesDisplayOrder = val
			} else {
				state.notesDisplayOrder = 'updatedAt'
			}
		},
		setPreviewFlag (state, val) {
			state.isPreview = val
		},
		setFullScreenFlag (state, val) {
			state.isFullScreen = val
		},
		setReduceToTrayFlag (state, val) {
			state.reduceToTray = val
		},
		setMonospace (state, val) {
			state.useMonospace = val
		},
		setFontsize (state, val) {
			if (isNaN(val)) {
				state.fontsize = 15
			} else {
				state.fontsize = val
			}
		}
	},
	actions: {
	}
}
