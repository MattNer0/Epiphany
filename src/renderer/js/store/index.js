import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import arr from '../utils/arr'
import models from '../models'

export default new Vuex.Store({
	state: {
		selectedBucket: null,
		selectedFolder: null,
		selectedNote  : null,
		draggingBucket: null,
		draggingFolder: null,
		draggingNote  : null,
		buckets       : [],
		images        : [],
		notes         : []
	},
	getters: {
		quickNotesBucket: state => {
			return state.buckets.find(r => r.quick_notes)
		},
		findBucketByPath: state => (path) => {
			return state.buckets.find(r => r.path === path)
		},
		findNoteByPath: state => (path) => {
			return state.notes.find(note => note.data.path === path)
		},
		notesHistory: state => {
			return arr.sortBy(state.notes.filter((n) => {
				return !n.isEncrypted
			}), 'updatedAt').slice(0, 10)
		}
	},
	mutations: {
		saveBuckets (state, buckets) {
			state.buckets = buckets
		},
		saveNotes (state, notes) {
			state.notes = notes
		},
		saveImages (state, images) {
			state.images = images
		},
		selectBucket (state, bucket) {
			state.selectedBucket = bucket
		},
		selectFolder (state, folder) {
			state.selectedFolder = folder
		},
		selectNote (state, note) {
			state.selectedNote = note
		},
		dragging(state, object) {
			state.draggingBucket = null
			state.draggingFolder = null
			state.draggingNote = null

			if (object) {
				if (object instanceof models.Rack) {
					state.draggingBucket = object
				} else if (object instanceof models.Folder) {
					state.draggingFolder = object
				} else {
					state.draggingNote = object
				}
			}
		}
	},
	actions: {
		loadedRacks ({ commit }, racks) {
			var racksArray = []
			racks.forEach((r) => {
				racksArray.push(new models.Rack(r))
			})

			commit('saveBuckets', arr.sortBy(racksArray.slice(), 'ordering', true))
		},
		addNewBucket ({ state, commit }, rack) {
			var racksArray = arr.sortBy(state.racks.slice(), 'ordering', true)
			racksArray.push(rack)
			racksArray.forEach((r, i) => {
				r.ordering = i
				r.saveModel()
			})

			commit('saveBuckets', racksArray)
		},
		removeBucket ({ state, commit }, rack) {
			var racksArray = state.racks.filter(r => r !== rack)
			racksArray.forEach((r, i) => {
				r.ordering = i
				r.saveModel()
			})
			commit('saveBuckets', racksArray)
		},
		addImages ({ state, commit }, images) {
			commit('saveImages', images.concat(state.images))
		},
		addNotes ({ state, commit }, notes) {
			commit('saveNotes', notes.concat(state.notes))
		},
		addNewNote ({ state, commit }, note) {
			var notesArray = state.notes.slice()
			notesArray.unshift(note)
			commit('saveNotes', notesArray)
		},
		removeNote ({ state, commit }, note) {
			var notesArray = state.notes.filter(n => n !== note)
			commit('saveNotes', notesArray)
		}
	}
})
