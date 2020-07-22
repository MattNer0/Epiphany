import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
const vuexLocal = new VuexPersistence({
	storage: window.localStorage,
	modules: ['options']
})

import libraryModule from './modules/library'
import editorModule from './modules/editor'
import optionsModule from './modules/options'

Vue.use(Vuex)

export default new Vuex.Store({
	modules: {
		library: libraryModule,
		editor : editorModule,
		options: optionsModule
	},
	plugins: [vuexLocal.plugin]
})
