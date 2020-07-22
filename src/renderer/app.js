import path from 'path'
import fs from 'fs'

import _ from 'lodash'

import PromiseWorker from 'promise-worker'

import settings from './js/utils/settings'
import traymenu from './js/utils/trayMenu'

import Vue from 'vue'
import VTooltip from 'v-tooltip'

Vue.use(VTooltip)

import Store from './js/store'

import models from './js/models'
import searcher from './js/searcher'

// electron things
import { ipcRenderer, remote, clipboard, shell, nativeImage } from 'electron'
const { Menu, MenuItem, dialog } = remote

import arr from './js/utils/arr'
import theme from './js/utils/theme'
import elosenv from './js/utils/elosenv'
import ittybitty from './js/utils/itty-bitty'

// vue.js plugins
import componentFlashmessage from './js/components/flashmessage.vue'
import componentHandlerNotes from './js/components/handlerNotes.vue'
import componentHandlerStack from './js/components/handlerStack.vue'
import componentModal from './js/components/modal.vue'
import componentBuckets from './js/components/buckets.vue'
import componentBucketsSpecial from './js/components/bucketsSpecial.vue'
import componentNotes from './js/components/notes.vue'
import componentAddNote from './js/components/addNote.vue'
import componentTitleBar from './js/components/titleBar.vue'
import componentSidebarToggle from './js/components/sidebarToggle.vue'
import componentNoteContainer from './js/components/noteContainer.vue'
import componentIdleSplash from './js/components/idleSplash.vue'
import componentNewNoteButton from './js/components/newNoteButton.vue'

import templateHtml from './html/app.html'

// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker'

const worker = new Worker()
const promiseWorker = new PromiseWorker(worker)

window.bus = new Vue()

settings.init()
settings.loadWindowSize()

// not to accept image dropping and so on.
// electron will show local images without this.
document.addEventListener('dragover', (e) => {
	e.preventDefault()
})
document.addEventListener('drop', (e) => {
	e.preventDefault()
	e.stopPropagation()
})

var settingsBaseLibraryPath = settings.get('baseLibraryPath')
if (settingsBaseLibraryPath) models.setBaseLibraryPath(settingsBaseLibraryPath)

var appVue = new Vue({
	el      : '#app',
	store   : Store,
	template: templateHtml,
	data    : {
		initLoading      : false,
		loadedRack       : false,
		readyToQuit      : false,
		minimizeTime     : null,
		currentTheme     : settings.getJSON('theme', 'dark'),
		librarySync      : null,
		preview          : '',
		quickNotesBucket : null,
		timeoutNoteChange: false,
		editTheme        : null,
		showHistory      : false,
		showAll          : false,
		showFavorites    : false,
		editingBucket    : null,
		editingFolder    : null,
		messages         : [],
		modalShow        : false,
		modalTitle       : 'title',
		modalDescription : 'description',
		modalPrompts     : [],
		modalOkcb        : null,
		racksWidth       : settings.getSmart('racksWidth', 220),
		notesWidth       : settings.getSmart('notesWidth', 220)
	},
	components: {
		'flashmessage'  : componentFlashmessage,
		'buckets'       : componentBuckets,
		'bucketsSpecial': componentBucketsSpecial,
		'notes'         : componentNotes,
		'modal'         : componentModal,
		'addNote'       : componentAddNote,
		'titleBar'      : componentTitleBar,
		'handlerStack'  : componentHandlerStack,
		'handlerNotes'  : componentHandlerNotes,
		'noteContainer' : componentNoteContainer,
		'idleSplash'    : componentIdleSplash,
		'sidebarToggle' : componentSidebarToggle,
		'newNoteButton' : componentNewNoteButton
	},
	computed: {
		racks() {
			return this.$store.state.library.buckets
		},
		notes() {
			return this.$store.state.library.notes
		},
		images() {
			return this.$store.state.library.images
		},
		selectedRack: {
			get() {
				return this.$store.state.library.selectedBucket
			},
			set(bucket) {
				this.$store.commit('library/selectBucket', bucket)
			}
		},
		selectedFolder: {
			get() {
				return this.$store.state.library.selectedFolder
			},
			set(folder) {
				this.$store.commit('library/selectFolder', folder)
			}
		},
		selectedNote: {
			get() {
				return this.$store.state.library.selectedNote
			},
			set(note) {
				this.$store.commit('library/selectNote', note)
			}
		},
		notesDisplayOrder: {
			get() {
				return this.$store.state.options.notesDisplayOrder
			},
			set(val) {
				this.$store.commit('options/setNotesDisplayOrder', val)
			}
		},
		noteTabs: {
			get() {
				return this.$store.state.library.noteTabs
			}
		},
		notesHistory() {
			return this.$store.getters['library/notesHistory']
		},
		draggingBucket() {
			return this.$store.state.library.draggingBucket
		},
		draggingFolder() {
			return this.$store.state.library.draggingFolder
		},
		search: {
			get() {
				return this.$store.state.editor.search
			},
			set(val) {
				this.$store.commit('editor/setSearch', val)
			}
		},
		isPreview: {
			get() {
				return this.$store.state.options.isPreview
			},
			set(val) {
				this.$store.commit('options/setPreviewFlag', val)
			}
		},
		isFullScreen: {
			get() {
				return this.$store.state.options.isFullScreen
			},
			set(val) {
				this.$store.commit('options/setFullScreenFlag', val)
				this.update_editor_size()
			}
		},
		reduceToTray: {
			get() {
				return this.$store.state.options.reduceToTray
			}
		},

		/**
		 * filters notes based on search terms
		 * @function filteredNotes
		 * @return  {Array}  notes array
		 */
		filteredNotes() {
			if (this.selectedFolder) {
				let notes
				if (this.selectedFolder.searchMatchName(this.search)) {
					notes = searcher.searchNotes('', this.selectedFolder.notes)
				} else {
					notes = searcher.searchNotes(this.search, this.selectedFolder.notes)
				}
				if (this.search && notes.length === 0) this.changeFolder({ folder: null })
				return notes
			} else if (this.selectedRack && this.showAll) {
				return searcher.searchNotes(this.search, this.selectedRack.allnotes)
			} else if (this.selectedRack && this.showFavorites) {
				return searcher.searchNotes(this.search, this.selectedRack.starrednotes)
			} else if (this.showHistory) {
				return this.notesHistory
			} else {
				return []
			}
		},
		searchRack() {
			if (this.search && this.racks.length > 0) {
				const metaRack = {
					folders: []
				}

				this.racks.forEach((r) => {
					r.folders.forEach((f) => {
						if (f.searchnotes(this.search).length > 0) {
							metaRack.folders.push(f)
						}
					})
				})

				return metaRack
			}

			return null
		},
		isNoteSelected() {
			if (this.selectedNote instanceof models.Note) return true
			return false
		},
		isOutlineSelected() {
			if (this.selectedNote instanceof models.Outline) return true
			return false
		},
		isThemeSelected() {
			return this.editTheme !== null
		},
		showFolderNotesList() {
			return !this.$store.state.library.draggingFolder && (this.selectedFolder || this.showAll || this.showFavorites)
		},
		currentThemeAsString() {
			if (typeof this.currentTheme === 'string') return this.currentTheme
			return 'custom'
		},
		libraryPath() {
			return models.getBaseLibraryPath()
		}
	},
	created() {
		this.$on('modal-show', (modalMessage) => {
			this.modalTitle = modalMessage.title
			this.modalDescription = modalMessage.description
			this.modalPrompts = modalMessage.prompts
			this.modalOkcb = modalMessage.okcb
			this.modalShow = true
		})

		if (!models.getBaseLibraryPath()) {
			// hey, this is the first time.
			models.setLibraryToInitial()

			settingsBaseLibraryPath = models.getBaseLibraryPath()
			settings.set('baseLibraryPath', settingsBaseLibraryPath)
		}

		if (models.doesLibraryExists()) {
			// library folder exists, let's read what's inside
			this.initRacks(models.getBaseLibraryPath())

		} else {
			elosenv.console.error("Couldn't open library directory. Path: " + models.getBaseLibraryPath())
			setTimeout(() => {
				settings.set('baseLibraryPath', '')
				this.$refs.dialog.init('Error', 'Couldn\'t open library directory.\nPath: '+models.getBaseLibraryPath(), [{
					label: 'Open new directory',
					cb   : () => {
						this.openSync()
					}
				}, {
					label : 'Cancel',
					cancel: true
				}])
			}, 100)
		}
	},
	mounted() {
		theme.load(this.currentTheme)

		ipcRenderer.send('trayicon-minimize', this.reduceToTray)

		this.$nextTick(() => {
			window.addEventListener('resize', (e) => {
				e.preventDefault()
				this.update_editor_size()
			})
			window.addEventListener('keydown', (e) => {
				if (((e.keyCode === 86 && e.shiftKey && e.ctrlKey) ||
					(e.keyCode === 80 && e.altKey) ||
					(e.keyCode === 86 && e.altKey)) && this.isPreview) {
					e.preventDefault()
					e.stopPropagation()
					this.togglePreview()
				}
			}, true)

			this.init_sidebar_width()
		})

		ipcRenderer.on('load-page-fail', (event, data) => {
			this.sendFlashMessage({
				time : 5000,
				level: 'error',
				text : 'Load Failed'
			})
		})

		ipcRenderer.on('load-page-finish', (event, data) => {
		})

		ipcRenderer.on('load-page-success', (event, data) => {
			switch (data.mode) {
				case 'note-from-url':
					if (data.markdown) {
						var newNote = this.addNote()
						if (data.url) {
							newNote.setMetadata('Web', data.url)
						}
						newNote.body = data.markdown
						this.sendFlashMessage({
							time : 1000,
							level: 'info',
							text : 'New Note From Url'
						})
					} else {
						this.sendFlashMessage({
							time : 5000,
							level: 'error',
							text : 'Conversion Failed'
						})
					}
					break
				default:
					break
			}
		})

		ipcRenderer.on('bucket-rename', (event, data) => {
			if (data && data.bucket_uid && this.editingBucket && this.editingBucket.uid === data.bucket_uid) {
				if (data.name) {
					this.editingBucket.name = data.name
					this.editingBucket.saveModel()
					if (this.selectedBucket !== this.editingBucket) {
						this.changeBucket({
							bucket : this.editingBucket,
							sidebar: true
						})
					}
					this.editingBucket = null
				} else if (this.editingBucket.name.length === 0) {
					if (this.editingBucket.folders.length > 0) {
						this.editingBucket.name = 'New Bucket'
					} else {
						this.removeRack(this.editingBucket)
						this.editingBucket = null
					}
				}
			}
		})

		ipcRenderer.on('focus', (event, data) => {
			if (data && data.focus) {
				document.getElementById('main-editor').classList.remove('blur')
			} else {
				document.getElementById('main-editor').classList.add('blur')
			}
		})

		ipcRenderer.on('window-minimize', () => {
			this.minimizeTime = new Date().getTime()
			this.saveDatabase()
		})

		ipcRenderer.on('window-restore', () => {
			if (this.minimizeTime && !this.isNoteSelected) {
				const currentTime = new Date().getTime()
				if (currentTime - this.minimizeTime > 1000) {
					this.minimizeTime = null
					this.reloadLibrary()
				}
			} else {
				this.minimizeTime = null
			}
		})

		window.bus.$on('change-bucket', eventData => this.changeBucket(eventData))
		window.bus.$on('change-folder', eventData => this.changeFolder(eventData))
		window.bus.$on('change-note', eventData => this.changeNote(eventData))
		window.bus.$on('toggle-fullscreen', eventData => this.toggleFullScreen(eventData))
		window.bus.$on('toggle-preview', eventData => this.togglePreview(eventData))
		window.bus.$on('flash-message', eventData => this.sendFlashMessage(eventData))
		window.bus.$on('add-note', eventData => this.addNote(eventData))
		window.bus.$on('add-note-from-url', eventData => this.addNoteFromUrl(eventData))
		window.bus.$on('add-encrypted-note', eventData => this.addEncryptedNote(eventData))
		window.bus.$on('add-outline', eventData => this.addOutline(eventData))
		window.bus.$on('save-note', eventData => this.saveNote(eventData))
		window.bus.$on('download-files', eventData => this.downloadFiles(eventData))
		window.bus.$on('download-file', eventData => this.downloadFile(eventData))

		if (process.env.NODE_ENV === 'production') {
			window.onbeforeunload = (e) => {
				if (this.readyToQuit) return
				e.returnValue = false // equivalent to `return false` but not recommended
				this.closingWindow()
				//this.saveAndQuit()
			}
		}

		if (navigator && navigator.storage && navigator.storage.persist) {
			navigator.storage.persist()
				.then(function(persistent) {
					if (persistent) {
						console.log('Storage will not be cleared except by explicit user action')
					} else {
						console.log('Storage may be cleared by the UA under storage pressure.')
					}
				})
		}
	},
	methods: {
		async initRacks(library) {
			if (this.initLoading) return
			this.initLoading = true
			//ipcRenderer.send('load-racks', { library })

			this.librarySync = await promiseWorker.postMessage({
				type: 'load-library-settings',
				data: {
					library,
					key: 'sync'
				}
			})

			if (this.librarySync === null) {
				await promiseWorker.postMessage({
					type: 'save-library-settings',
					data: {
						library,
						key  : 'sync',
						value: 'local'
					}
				})
				this.librarySync = 'local'
			}

			if (this.librarySync === 'local') {
				await this.initRacksFromFs(library)
			} else {
				this.initLoading = false
			}
		},
		async initRacksFromFs(library) {
			try {
				const racks = await promiseWorker.postMessage({
					type: 'load-racks',
					data: {
						library
					}
				})

				this.$store.dispatch('library/loadedRacks', racks)
				this.quickNotesBucket = this.$store.getters['library/quickNotesBucket']
				this.loadedRack = true

				const folders = await promiseWorker.postMessage({
					type: 'load-folders',
					data: {
						racks
					}
				})

				folders.forEach((r) => {
					const rack = this.$store.getters['library/findBucketByPath'](r.rack)
					const folders = []
					r.folders.forEach((f) => {
						if (rack.folders && rack.folders.length > 0) {
							const currentFolder = rack.folders.find(d => d.path === f.path)
							if (currentFolder) {
								folders.push(currentFolder)
								return
							}
						}

						f.rack = rack
						folders.push(new models.Folder(f))
					})

					rack.folders = arr.sortBy(folders.slice(), 'ordering', true)
				})

				this.update_editor_size()

				for (const folder of folders) {
					const notes = await promiseWorker.postMessage({
						type: 'load-notes',
						data: {
							library,
							folder
						}
					})

					let rack
					notes.forEach((r) => {
						if (!rack || rack.path !== r.rack) {
							rack = this.$store.getters['library/findBucketByPath'](r.rack)
						}
						this.initByParent(r, rack)
					})
				}

				const data = await promiseWorker.postMessage({
					type: 'clean-database',
					data: {
						library
					}
				})
				if (data && data.num) {
					this.$store.commit('library/setDatabaseSize', data.num)
				}

				this.initCompleted()

			} catch (err) {
				this.initLoading = false
				console.error(err)
			}
		},
		initByParent(obj, rack, parent) {
			var folder
			if (parent) {
				folder = parent.folders.find((f) => {
					return f.path === obj.folder
				})
			} else if (rack) {
				folder = rack.folders.find((f) => {
					return f.path === obj.folder
				})
			}

			if (folder) {
				const notes = []
				const images = []

				obj.notes.forEach((n) => {
					if (folder.notes && folder.notes.length > 0) {
						const currentNote = folder.notes.find(f => f.path === n.path)
						if (currentNote) {
							notes.push(currentNote)
							return
						}
					}

					n.rack = rack
					n.folder = folder
					switch (n.type) {
						case 'encrypted':
							notes.push(new models.EncryptedNote(n))
							break
						case 'outline':
							notes.push(new models.Outline(n))
							break
						default:
							notes.push(new models.Note(n))
							break
					}
				})

				obj.images.forEach((img) => {
					img.rack = rack
					img.folder = folder
					images.push(new models.Image(img))
				})

				folder.notes = notes
				folder.images = images
				this.$store.dispatch('library/addNotes', notes)
				this.$store.dispatch('library/addImages', images)

				if (obj.subnotes && obj.subnotes.length > 0) {
					obj.subnotes.forEach((r) => {
						this.initByParent(r, rack, folder)
					})
				}
			}
		},
		initCompleted() {
			this.initLoading = false
			traymenu.init()

			if (this.notes.length === 1) {
				this.changeNote({ note: this.notes[0] })

			} else if (remote.getGlobal('argv')) {
				const argv = remote.getGlobal('argv')
				if (argv.length > 1 && path.extname(argv[1]) === '.md' && fs.existsSync(argv[1])) {
					const openedNote = this.$store.getters['library/findNoteByPath'](argv[1])
					if (openedNote) {
						this.changeNote({ note: openedNote })
					} else {
						elosenv.console.error('Path not valid')
					}
				}
			}
		},
		reloadLibrary() {
			this.sendFlashMessage({
				time : 1000,
				level: 'info',
				text : 'Reloading library...'
			})
			this.initRacks(models.getBaseLibraryPath())
		},
		findFolderByPath(rack, folderPath) {
			try {
				var folder = rack.folders.find((f) => {
					return f.path === folderPath
				})
				if (folder) return folder
				var rp = path.relative(rack.path, folderPath)
				rp = rp.split(path.sep)
				var parent = rack
				for (var i = 0; i < rp.length; i++) {
					parent = parent.folders.filter((f) => {
						return f.path === path.join(parent.path, rp[i])
					})[0]
				}
				return parent
			} catch (e) {
				elosenv.console.warn('Couldn\'t find folder by path "' + folderPath + '"')
				return null
			}
		},
		/**
		 * initialize the width of the left sidebar elements.
		 * @function init_sidebar_width
		 * @return {Void} Function doesn't return anything
		 */
		init_sidebar_width() {
			this.racksWidth = Math.min(this.racksWidth, this.notesWidth)
			this.notesWidth = this.racksWidth

			const handlerStack = document.getElementById('handlerStack')
			if (handlerStack) {
				handlerStack.previousElementSibling.style.width = this.racksWidth + 'px'
				this.$refs.refHandleStack.checkWidth(this.racksWidth)
			}

			const handlerNotes = document.getElementById('handlerNotes')
			if (handlerNotes) {
				handlerNotes.previousElementSibling.style.width = this.notesWidth + 'px'
				this.$refs.refHandleNote.checkWidth(this.notesWidth)
			}

			this.$nextTick(() => {
				this.update_editor_size()
			})
		},
		/**
		 * scrolls to the top of the notes sidebar.
		 * @function scrollUpScrollbarNotes
		 * @return {Void} Function doesn't return anything
		 */
		scrollUpScrollbarNotes() {
			this.$nextTick(() => {
				if (this.$refs.refNotes) this.$refs.refNotes.scrollTop = 0
			})
		},
		openHistory() {
			this.changeBucket({ bucket: null, sidebar: true, history: !this.showHistory })
		},
		closeOthers() {
			this.changeBucket({ bucket: null })
			this.showHistory = false
		},
		changeBucket({ bucket, sidebar, history }) {
			let shouldUpdateSize = false

			if (this.selectedRack === null && bucket) shouldUpdateSize = true
			else if (this.selectedFolder !== null && bucket) shouldUpdateSize = true
			else if (this.selectedRack !== null && bucket === null) shouldUpdateSize = true

			if (bucket !== null && this.quickNotesBucket === bucket) {
				const newNoteFolder = this.quickNotesBucket.folders.find((obj) => {
					return obj.name === 'New Notes'
				})
				this.selectedRack = bucket
				this.showHistory = false
				if (newNoteFolder) {
					this.changeFolder({ folder: newNoteFolder })
				} else {
					this.newQuickNoteBucket()
				}

			} else if (bucket === null || bucket instanceof models.Rack) {
				this.selectedRack = bucket
				if (bucket === null) this.selectedFolder = null
				this.editingFolder = null
				if (sidebar) {
					this.showAll = false
					this.showFavorites = false
					this.showHistory = typeof history === 'boolean' ? history : false
					shouldUpdateSize = true
				}
			} else if (bucket instanceof models.Folder) {
				this.changeFolder({ folder: bucket })
			}

			if (shouldUpdateSize) {
				this.update_editor_size()
			}
		},
		changeFolder({ folder, weak }) {
			if (weak && folder && (this.showAll || this.showFavorites) && this.selectedRack === folder.rack) return
			if ((this.selectedFolder === null && folder) || (this.selectedFolder && folder === null)) this.update_editor_size()
			this.editingFolder = null

			if (!weak) {
				this.showHistory = false
			}
			if (folder && !this.showHistory) this.selectedRack = folder.rack
			this.selectedFolder = folder
			this.showAll = false
			this.showFavorites = false

			this.loadAllNotesInFolder(folder)
		},
		async loadAllNotesInFolder(folder) {
			if (this.selectedFolder === folder) {
				const noteObjects = []
				for (let i=0; i < this.filteredNotes.length; i++) {
					const currentNote = this.filteredNotes[i]
					const hasSummary = Boolean(typeof currentNote._summary === 'string' && currentNote._summary.length > 0)
					const note = await this.loadOneNoteInFolder(this.filteredNotes[i])
					if (note && !hasSummary) {
						noteObjects.push(note)
					}

					await new Promise(resolve => setTimeout(resolve, 200))
				}

				if (noteObjects.length > 0) {
					await promiseWorker.postMessage({
						type: 'cache-notes',
						data: {
							library: models.getBaseLibraryPath(),
							notes  : noteObjects
						}
					})
				}
			}
		},
		loadOneNoteInFolder(note) {
			return new Promise((resolve, reject) => {
				try {
					if (!note.loaded) {
						if (note.loadBody()) {
							return resolve(note.getObjectDB(models.getBaseLibraryPath()))
						}
					}
					return resolve(null)
				} catch (err) {
					return reject(err)
				}
			})
		},
		showAllRack(rack) {
			this.selectedRack = rack
			this.selectedFolder = null
			this.editingFolder = null
			this.showHistory = false
			this.showAll = true
			this.showFavorites = false

			this.update_editor_size()
		},
		showFavoritesRack(rack) {
			this.selectedRack = rack
			this.selectedFolder = null
			this.editingFolder = null
			this.showHistory = false
			this.showAll = false
			this.showFavorites = true

			this.update_editor_size()
		},
		changeNote({ note, newtab, sidebar }) {
			const currentNote = this.selectedNote
			if (this.isNoteSelected && currentNote && currentNote !== note) {
				promiseWorker.postMessage({
					type: 'save-note',
					data: {
						library  : models.getBaseLibraryPath(),
						note     : currentNote.saveData(),
						isOutline: currentNote.isOutline
					}
				})
					.then(res => {
						if (res.path) currentNote.path = res.path

						if (res.saved) {
							this.notifyNoteSaved(currentNote, false)
						}
					})
			}

			if (note !== null && sidebar && this.draggingNote) {
				this.draggingNote = false
			}

			this.editTheme = null
			this.timeoutNoteChange = true
			setTimeout(() => {
				this.timeoutNoteChange = false
			}, 200)

			if (note === null) {
				this.selectedNote = null
				return
			} else if (note === this.selectedNote) {
				if (this.selectedRack === null && !this.showHistory) this.changeFolder({ folder: note.folder })
				return
			}

			if (!this.showHistory && !this.showAll && !this.showFavorites) {
				if (note.folder && note.folder instanceof models.Folder) {
					note.folder.parent.openFolder = true
					if (this.selectedFolder !== note.folder) {
						this.changeFolder({ folder: note.folder, weak: true })
					}
				}
			}

			if (this.noteTabs.length > 1) {
				newtab = true
			}

			if (this.noteTabs.length === 0) {
				this.$store.commit('library/pushToTabs', note)
			} else if (this.noteTabs.indexOf(note) === -1) {
				if (newtab) {
					this.$store.commit('library/pushToTabs', note)
				}

				if (!newtab && this.selectedNote) {
					this.$store.commit('library/replaceTab', note)
				}
			}

			if (note instanceof models.Outline) {
				this.selectedNote = note
			} else {
				if (!note.loaded) {
					if (note.loadBody()) {
						promiseWorker.postMessage({
							type: 'cache-note',
							data: {
								library: models.getBaseLibraryPath(),
								note   : note.getObjectDB(models.getBaseLibraryPath())
							}
						})
					}
				}
				if (note.isEncrypted) {
					const message = 'Insert the secret key to Encrypt and Decrypt this note'
					this.$refs.dialog.init('Secret Key', message, [{
						label: 'Ok',
						cb   : (data) => {
							var result = note.decrypt(data.secretkey)
							if (result.error) {
								setTimeout(() => {
									this.$refs.dialog.init('Error', result.error + '\nNote: ' + note.path, [{
										label : 'Ok',
										cancel: true
									}])
								}, 100)
							} else {
								this.selectedNote = note
							}
						}
					}, {
						label : 'Cancel',
						cancel: true
					}], [{
						type    : 'password',
						retValue: '',
						label   : 'Secret Key',
						name    : 'secretkey',
						required: true
					}])
				} else {
					this.selectedNote = note
					setTimeout(() => {
						if (document.body.clientWidth <= 580 && !this.isFullScreen) {
							this.toggleFullScreen()
						}
					}, 400)
				}
			}
		},
		/**
		 * @description removes the Rack (and its contents) from the current working directory.
		 * @param  {Object}  rack    The rack
		 * @return {Void} Function doesn't return anything
		 */
		removeRack(rack) {
			let shouldUpdateSize = false
			if (this.selectedRack === rack) {
				this.selectedRack = null
				shouldUpdateSize = true
			}
			if (this.selectedFolder && this.selectedFolder.rack === rack) {
				this.selectedFolder = null
				shouldUpdateSize = true
			}
			if (this.quickNotesBucket === rack) {
				this.quickNotesBucket = null
				shouldUpdateSize = true
			}

			rack.remove(this.notes)
			this.$store.dispatch('library/removeBucket', rack)

			// we need to close the current selected note if it was from the removed rack.
			if (this.isNoteSelected && this.selectedNote.rack === rack) {
				this.selectedNote = null
			}
			if (shouldUpdateSize) {
				this.update_editor_size()
			}
		},
		setEditingRack(bucket) {
			if (bucket) {
				this.editingBucket = bucket
				ipcRenderer.send('open-popup', {
					type      : 'input-text',
					theme     : this.currentTheme,
					title     : 'Rename Bucket',
					form      : 'bucket-name',
					bucket    : bucket.name,
					bucket_uid: bucket.uid,
					height    : 'small',
					width     : 'small'
				})
			} else {
				this.editingBucket = null
			}
		},
		setEditingFolder(folder) {
			if (folder) {
				this.editingFolder = folder.uid
			} else {
				this.editingFolder = null
			}
		},
		/**
		 * inserts a new Folder inside the selected Rack.
		 * The new Folder is placed on top of the list.
		 * @function addFolderToRack
		 * @param  {Object}  rack    The rack
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		addFolderToRack(rack, folder) {
			var folders = arr.sortBy(rack.folders.slice(), 'ordering', true)
			folders.unshift(folder)
			folders.forEach((f, i) => {
				f.ordering = i
				f.saveModel()
			})
			rack.folders = folders
		},
		/**
		 * deletes a folder and its contents from the parent rack.
		 * @function deleteFolder
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		deleteFolder(folder) {
			if (this.selectedFolder === folder) this.selectedFolder = null
			arr.remove(folder.parent.folders, (f) => {
				return f === folder
			})
			folder.remove(this.notes)
			// we need to close the current selected note if it was from the removed folder.
			if (this.isNoteSelected && this.selectedNote.folder === folder) {
				this.selectedNote = null
			}
		},
		deleteNote(note) {
			if (note.folder && note.folder.notes.length > 0) {
				var i1 = note.folder.notes.indexOf(note)
				note.folder.notes.splice(i1, 1)
			}

			this.$store.dispatch('library/removeNote', note)
			if (this.selectedNote === note) {
				this.selectedNote = null
			}

			if (note.remove()) {
				promiseWorker.postMessage({
					type: 'delete-note',
					data: {
						library: models.getBaseLibraryPath(),
						path   : note.path
					}
				})
			}
		},
		newQuickNoteBucket() {
			const newFolder = () => {
				const folder = new models.Folder({
					name        : 'New Notes',
					rack        : this.quickNotesBucket,
					parentFolder: undefined,
					rackUid     : this.quickNotesBucket.uid,
					ordering    : 0
				})
				this.addFolderToRack(this.quickNotesBucket, folder)
				this.changeFolder({ folder: folder })
			}

			if (!this.quickNotesBucket) {
				this.quickNotesBucket = new models.Rack({
					name: '_quick_notes',
					path: path.join(
						settingsBaseLibraryPath,
						'_quick_notes'
					),
					quick_notes: true,
					ordering   : 0
				})
				this.$store.dispatch('library/addNewBucket', this.quickNotesBucket)
				newFolder()

			} else if (this.quickNotesBucket.folders.length === 0) {
				newFolder()
			} else {
				var rightFolder = null
				for (let i=0; i<this.quickNotesBucket.folders.length; i++) {
					if (this.quickNotesBucket.folders[i].name === 'New Notes') {
						rightFolder = this.quickNotesBucket.folders[i]
						break
					}
				}

				if (rightFolder === null) {
					newFolder()
				} else {
					this.changeFolder({ folder: rightFolder })
				}
			}
		},
		newQuickNote() {
			this.showHistory = false
			this.newQuickNoteBucket()
			this.addNote()

			this.$nextTick(() => {
				if (this.isFullScreen) {
					this.toggleFullScreen()
				}
			})
		},
		/**
		 * event called after folder was dragged into a rack.
		 * @param  {Object}  rack    The rack
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		folderDragEnded(rack) {
			if (!rack) return
			rack.folders = arr.sortBy(rack.folders.slice(), 'ordering', true)
		},
		/**
		 * toggles left sidebar.
		 * @return {Void} Function doesn't return anything
		 */
		toggleFullScreen() {
			this.setFullScreen(!this.isFullScreen)
		},
		setFullScreen(value) {
			this.isFullScreen = value
		},
		/**
		 * @description toggles markdown note preview.
		 * @return {Void} Function doesn't return anything
		 */
		togglePreview() {
			this.isPreview = !this.isPreview
		},
		calcSaveUid() {
			if (this.selectedRack) {
				var f = this.selectedRack.folders
				if (!f || f.length === 0) {
					return null
				}
				return f[0].uid
			} else if (this.selectedFolder) {
				return this.selectedFolder.uid
			}
			return null
		},
		/**
		 * finds the currently selected folder.
		 * if a rack object is selected instead of a folder object,
		 * then it will get the first folder inside the rack.
		 * @return  {Object}  Folder object if one is selected, 'null' otherwise
		 */
		getCurrentFolder() {
			if (this.selectedFolder) {
				return this.selectedFolder
			} else if (this.selectedRack) {
				var f = this.selectedRack.folders
				if (!f || f.length === 0) {
					return null
				}
				return f[0]
			}
			return null
		},
		/**
		 * add new note to the current selected Folder
		 * @return  {Note}  New Note object
		 */
		addNote() {
			const currFolder = this.getCurrentFolder()
			this.changeNote({ note: null })
			this.changeFolder({ folder: currFolder })
			const newNote = models.Note.newEmptyNote(currFolder)
			if (newNote) {
				if (this.search.length > 0) this.search = ''
				currFolder.notes.unshift(newNote)
				this.$store.dispatch('library/addNewNote', newNote)
				this.isPreview = false
				this.changeNote({ note: newNote })
			} else {
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : 'You must select a Folder!'
				})
			}
			return newNote
		},
		addOutline() {
			const currFolder = this.getCurrentFolder()
			this.changeNote({ note: null })
			this.changeFolder({ folder: currFolder })
			const newOutline = models.Outline.newEmptyOutline(currFolder)
			if (newOutline) {
				if (this.search.length > 0) this.search = ''
				currFolder.notes.unshift(newOutline)
				this.$store.dispatch('library/addNewNote', newOutline)
				this.isPreview = false
				this.changeNote({ note: newOutline })
			} else {
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : 'You must select a Folder!'
				})
			}
			return newOutline
		},
		/**
		 * add new encrypted note to the current selected Folder
		 * @return {Void} Function doesn't return anything
		 */
		addEncryptedNote() {
			const currFolder = this.getCurrentFolder()
			this.changeNote({ note: null })
			this.changeFolder({ folder: currFolder })
			const newNote = models.EncryptedNote.newEmptyNote(currFolder)
			if (newNote) {
				if (this.search.length > 0) this.search = ''
				currFolder.notes.unshift(newNote)
				this.$store.dispatch('library/addNewNote', newNote)
				this.isPreview = false
				this.changeNote({ note: newNote })
				newNote.saveModel()
			} else {
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : 'You must select a Folder!'
				})
			}
		},
		/**
		 * @description save current selected Note.
		 * @return {Void} Function doesn't return anything
		 */
		saveNote: _.debounce(function () {
			const currentNote = this.selectedNote
			if (currentNote) {
				promiseWorker.postMessage({
					type: 'save-note',
					data: {
						library  : models.getBaseLibraryPath(),
						note     : currentNote.saveData(),
						isOutline: currentNote.isOutline
					}
				})
					.then(res => {
						if (!currentNote) return
						if (res.path) currentNote.path = res.path

						if (res.error) {
							this.sendFlashMessage({
								time : 5000,
								level: 'error',
								text : res.error
							})
						}

						if (res.saved) {
							this.notifyNoteSaved(currentNote, true)
						}
					})
			}
		}, 1000),
		async notifyNoteSaved(currentNote, showFlash) {
			await promiseWorker.postMessage({
				type: 'saved-note',
				data: {
					library: models.getBaseLibraryPath(),
					note   : currentNote.getObjectDB(models.getBaseLibraryPath())
				}
			})

			if (showFlash) {
				this.sendFlashMessage({
					time : 1000,
					level: 'info',
					text : 'Note saved'
				})
				if (currentNote && this.notesDisplayOrder === 'updatedAt' && !this.showHistory) {
					this.scrollUpScrollbarNotes()
				}
			}
		},
		addNoteFromUrl() {
			ipcRenderer.send('open-popup', {
				type  : 'input-text',
				theme : this.currentTheme,
				title : 'New Note From URL',
				form  : 'note-url',
				height: 'small'
			})
		},
		/**
		 * @description displays an image with the popup dialog
		 * @param  {String}  url  The image url
		 * @return {Void} Function doesn't return anything
		 */
		openImg(url) {
			const image = nativeImage.createFromPath(url.replace('epiphany://', ''))
			var dimensions = image.getSize()
			this.$refs.dialog.image(url, dimensions.width, dimensions.height)
		},
		contextOnPreviewLink(e, href) {
			if (e.stopPropagation) {
				e.stopPropagation()
			}

			var m = new Menu()
			m.append(new MenuItem({
				label: 'Copy Link',
				click: function() {
					clipboard.writeText(href)
				}
			}))
			m.append(new MenuItem({
				label: 'Open Link In Browser',
				click: () => {
					shell.openExternal(href)
				}
			}))
			m.popup(remote.getCurrentWindow())
		},
		contextOnInternalLink(e, href) {
			if (e.stopPropagation) {
				e.stopPropagation()
			}

			var m = new Menu()
			m.append(new MenuItem({
				label: 'Copy Link',
				click: () => {
					clipboard.writeText(href)
				}
			}))
			m.append(new MenuItem({
				label: 'Open in new tab',
				click: () => {
					this.openInternalLink(null, href, true)
				}
			}))
			m.popup(remote.getCurrentWindow())
		},
		openInternalLink(e, href, newTab) {
			if (e && e.stopPropagation) {
				e.stopPropagation()
			}

			href = href.replace('coon://library/', '')
			href = decodeURIComponent(href)
			href = path.join(settingsBaseLibraryPath, href)

			var noteObj = this.$store.getters['library/findNoteByPath'](href)
			if (noteObj) {
				this.changeNote({ note: noteObj, newtab: newTab })
			}
		},
		open_share_url() {
			if (this.preview) {
				var cssHtml = '<style>#share{margin: 2em auto; width: 100%; max-width: 1200px;}ul.task-list{list-style: none;padding-left: 0;}</style>'
				var previewHtml = '<div id="share">' + cssHtml + this.preview + '</div>'
				ittybitty.get_uri(previewHtml, this.selectedNote.title, function(url) {
					shell.openExternal(url)
				})
			}
		},
		loadThemeFromFile() {
			dialog.showOpenDialog({
				title  : 'Import Theme',
				filters: [{
					name      : 'Theme',
					extensions: ['json']
				}],
				properties: ['openFile']
			})
				.then(result => {
					if (result.canceled || !result.filePaths) {
						return
					}
					const themePath = result.filePaths[0]

					try {
						const fileContents = fs.readFileSync(themePath, 'utf8')
						this.setCustomTheme(JSON.parse(fileContents))
					} catch (e) {
						console.error(e)
					}
				})
				.catch(err => {
					console.error(err)
				})
		},
		setCustomTheme(themeJson) {
			if (typeof themeJson === 'string') {
				if (this.currentTheme === themeJson) return
				this.currentTheme = themeJson
				theme.load(this.currentTheme)
				settings.set('theme', this.currentTheme)

			} else {
				var themeKeys = theme.keys()
				var intersectionKeys = _.intersection(themeKeys, Object.keys(themeJson))
				if (intersectionKeys.length === themeKeys.length) {
					this.currentTheme = themeJson
					theme.load(this.currentTheme)
					settings.set('theme', this.currentTheme)

				} else {
					console.error('wrong keys')
				}
			}
		},
		editThemeView() {
			let themeJson
			if (typeof this.currentTheme === 'string') {
				themeJson = theme.read_file(this.currentTheme)
			} else {
				themeJson = this.currentTheme
			}

			this.changeNote({ note: null })
			this.editTheme = themeJson

			this.toggleFullScreen()
		},
		moveSync() {
			var currentPath = models.getBaseLibraryPath()
			dialog.showOpenDialog({
				title      : 'Select New Sync Folder',
				defaultPath: currentPath || '/',
				properties : ['openDirectory', 'createDirectory', 'promptToCreate']
			})
				.then(result => {
					if (result.canceled || !result.filePaths) {
						return
					}
					var newPath = result.filePaths[0]

					// copy files
					if (models.copyData(currentPath, newPath)) {
						models.setBaseLibraryPath(newPath)
						settings.set('baseLibraryPath', newPath)
						remote.getCurrentWindow().reload()
					} else {
						this.sendFlashMessage({
							time : 5000,
							level: 'error',
							text : 'Directory is not Valid'
						})
					}
				})
				.catch(err => {
					console.error(err)
				})
		},
		openSync() {
			var currentPath = models.getBaseLibraryPath()
			promiseWorker.postMessage({
				type: 'save-database',
				data: {
					library: currentPath
				}
			})
				.then(() => {
					return dialog.showOpenDialog({
						title      : 'Open Existing Sync Folder',
						defaultPath: currentPath || '/',
						properties : ['openDirectory', 'createDirectory']
					})
				})
				.then(result => {
					if (result.canceled || !result.filePaths) {
						return
					}
					var newPath = result.filePaths[0]

					models.setBaseLibraryPath(newPath)
					settings.set('baseLibraryPath', newPath)

					return promiseWorker.postMessage({
						type: 'close-database',
						data: {}
					})
				})
				.then(() => {
					remote.getCurrentWindow().reload()
				})
				.catch((err) => {
					this.sendFlashMessage({
						time : 5000,
						level: 'error',
						text : 'Error: '+ err.message
					})
				})
		},
		/**
		 * shows the About dialog window.
		 * @function openAbout
		 * @return {Void} Function doesn't return anything
		 */
		openAbout() {
			ipcRenderer.send('open-popup', {
				type   : 'about',
				theme  : this.currentTheme,
				library: models.getBaseLibraryPath(),
				title  : 'About',
				height : 'medium'
			})
		},
		saveDatabase() {
			promiseWorker.postMessage({
				type: 'save-database',
				data: {
					library: models.getBaseLibraryPath()
				}
			})
				.then(() => {
					this.sendFlashMessage({
						time : 1000,
						level: 'info',
						text : 'Database saved'
					})
				})
				.catch((err) => {
					console.error(err.message)
				})
		},
		cleanDatabase() {
			promiseWorker.postMessage({
				type: 'clean-database',
				data: {
					library: models.getBaseLibraryPath()
				}
			})
				.then(data => {
					if (data && data.num) {
						this.$store.commit('library/setDatabaseSize', data.num)
						this.sendFlashMessage({
							time : 1500,
							level: 'info',
							text : 'Database cleaned - ' + data.num + (data.num > 1 ? ' notes' : ' note')
						})
					} else {
						this.sendFlashMessage({
							time : 1000,
							level: 'info',
							text : 'Database cleaned'
						})
					}
				})
		},
		downloadFiles(data) {
			promiseWorker.postMessage({
				type: 'download-files',
				data: {
					...data
				}
			}).then(() => {
				this.sendFlashMessage({
					time : 1000,
					level: 'info',
					text : 'Files downloaded'
				})
			}).catch((err) => {
				console.error(err.message)

				if (!data.replaced || data.replaced.length === 0) return
				var noteObj = this.$store.getters['library/findNoteByPath'](data.note)
				if (noteObj) {
					for (let i=0; i<data.replaced.length; i++) {
						var subStr = data.replaced[i]
						noteObj.body = noteObj.body.replace(subStr.new, subStr.original)
					}
				}
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : 'Files download fail'
				})
			})
		},
		downloadFile(data) {
			promiseWorker.postMessage({
				type: 'download-file',
				data: {
					...data
				}
			}).then(() => {
				this.sendFlashMessage({
					time : 1000,
					level: 'info',
					text : 'File downloaded'
				})
			}).catch((err) => {
				console.error(err.message)
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : 'File download fail'
				})
			})
		},
		sendFlashMessage({ time, level, text, url }) {
			var message = {
				level : 'flashmessage-' + level,
				text  : text,
				period: time,
				url   : url
			}
			this.messages.push(message)
			setTimeout(() => {
				this.messages.shift()
			}, message.period)
		},
		/**
		 * saves the sidebar width (both racks and notes lists).
		 * @function save_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		save_editor_size() {
			this.racksWidth = parseInt(this.$refs.sidebarFolders.style.width.replace('px', '')) || 180
			settings.set('racksWidth', this.racksWidth)
			this.notesWidth = parseInt(this.$refs.sidebarNotes.style.width.replace('px', '')) || 180
			settings.set('notesWidth', this.notesWidth)
		},
		sidebarDrag: _.debounce(function () {
			this.update_editor_size()
		}, 100),
		sidebarDragEnd() {
			this.update_editor_size()
			this.save_editor_size()
		},
		saveAndQuit() {
			this.readyToQuit = true

			if (this.selectedNote) {
				this.selectedNote.saveModel()
			}

			promiseWorker.postMessage({
				type: 'save-database',
				data: {
					library: models.getBaseLibraryPath()
				}
			})
				.then(() => {
					this.closingWindow(true)
				})
				.catch((err) => {
					this.closingWindow(true)
					console.error(err.message)
				})
		},
		closingWindow(quit) {
			promiseWorker.postMessage({
				type: 'save-database',
				data: {
					library: models.getBaseLibraryPath()
				}
			})
				.then(() => {
					settings.saveWindowSize()
					this.readyToQuit = true

					if (quit) {
						remote.app.quit()
					} else {
						var win = remote.getCurrentWindow()
						win.hide()
					}
				})
				.catch((err) => {
					console.error(err.message)
					this.sendFlashMessage({
						time : 5000,
						level: 'error',
						text : 'Failed to save database'
					})
				})
		},
		/**
		 * calculates the sidebar width and
		 * changes the main container margins to accomodate it.
		 * If the application is in fullscreen mode (sidebar hidden)
		 * then the sidebar is moved outside of the visible workspace.
		 * @function update_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		update_editor_size: _.debounce(function () {
			var widthTotalLeft = 0
			var widthFixedLeft = 0

			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar > div')
			var cellsFixedLeft = document.querySelectorAll('.outer_wrapper .fixed-sidebar > div')

			for (let i = 0; i < cellsLeft.length; i++) {
				widthTotalLeft += cellsLeft[i].offsetWidth
			}

			for (let i = 0; i < cellsFixedLeft.length; i++) {
				widthFixedLeft += cellsFixedLeft[i].offsetWidth
			}

			if (this.isFullScreen) {
				document.querySelector('.sidebar').style.left = '-' + widthTotalLeft + 'px'
				widthTotalLeft = widthFixedLeft
			} else {
				document.querySelector('.sidebar').style.left = ''
				widthTotalLeft += widthFixedLeft
			}

			if (document.body.clientWidth > 580) {
				this.$store.commit('editor/saveContainerMargin', widthTotalLeft + 'px')
			} else {
				this.$store.commit('editor/saveContainerMargin', '')
			}
		}, 100)
	},
	watch: {
		'selectedNote.body': function(newBody, oldBody) {
			if (this.selectedNote instanceof models.Outline) return
			if (oldBody && !this.timeoutNoteChange) {
				this.saveNote()
			}
		},
		selectedRack() {
			this.scrollUpScrollbarNotes()
		},
		selectedFolder() {
			this.scrollUpScrollbarNotes()
		},
		draggingBucket() {
			this.update_editor_size()
		},
		draggingFolder() {
			this.update_editor_size()
		}
	}
})
global.appVue = appVue
