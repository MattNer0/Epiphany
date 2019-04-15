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
		buckets       : []
	},
	getters: {
		quickNotesBucket: state => {
			return state.buckets.find(r => r.quick_notes)
		},
		findBucketByPath: state => (path) => {
			return state.buckets.find(r => r.path === path)
		}
	},
	mutations: {
		saveBuckets (state, buckets) {
			state.buckets = buckets
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
		}
	}
})