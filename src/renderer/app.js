import path from 'path'
import fs from 'fs'

import _ from 'lodash'

import settings from './js/utils/settings'
import traymenu from './js/utils/trayMenu'
import titleMenu from './js/utils/titleMenu'

import Vue from 'vue'
import VTooltip from 'v-tooltip'

Vue.use(VTooltip)

import Store from './js/store'

import models from './js/models'
import preview from './js/preview'
import searcher from './js/searcher'

// electron things
import { ipcRenderer, remote, clipboard, shell, nativeImage } from 'electron'
const { Menu, MenuItem, dialog } = remote

import arr from './js/utils/arr'
import theme from './js/utils/theme'
import elosenv from './js/utils/elosenv'
import ittybitty from './js/utils/itty-bitty'

// vue.js plugins
import componentOutline from './js/components/outline.vue'
import componentCodeMirror from './js/components/codemirror.vue'
import componentFlashmessage from './js/components/flashmessage.vue'
import componentHandlerNotes from './js/components/handlerNotes.vue'
import componentHandlerStack from './js/components/handlerStack.vue'
import componentModal from './js/components/modal.vue'
import componentNoteMenu from './js/components/noteMenu.vue'
import componentNoteFooter from './js/components/noteFooter.vue'
import componentBuckets from './js/components/buckets.vue'
import componentBucketsSpecial from './js/components/bucketsSpecial.vue'
import componentNotes from './js/components/notes.vue'
import componentAddNote from './js/components/addNote.vue'
import componentTitleBar from './js/components/titleBar.vue'
import componentTabsBar from './js/components/tabsBar.vue'
import componentThemeEditor from './js/components/themeEditor.vue'
import componentThemeMenu from './js/components/themeMenu.vue'

import templateHtml from './html/app.html'

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
		loadedRack       : false,
		isFullScreen     : false,
		isPreview        : false,
		isToolbarEnabled : settings.getSmart('toolbarNote', true),
		isFullWidthNote  : settings.getSmart('fullWidthNote', true),
		keepHistory      : settings.getSmart('keepHistory', true),
		currentTheme     : settings.getJSON('theme', 'dark'),
		useMonospace     : settings.getSmart('useMonospace', false),
		reduceToTray     : settings.getSmart('reduceToTray', true),
		preview          : '',
		quickNotesBucket : null,
		timeoutNoteChange: false,
		editTheme        : null,
		showHistory      : false,
		showAll          : false,
		showFavorites    : false,
		noteTabs         : [],
		editingBucket    : null,
		editingFolder    : null,
		search           : '',
		messages         : [],
		modalShow        : false,
		modalTitle       : 'title',
		modalDescription : 'description',
		modalPrompts     : [],
		modalOkcb        : null,
		racksWidth       : settings.getSmart('racksWidth', 220),
		notesWidth       : settings.getSmart('notesWidth', 220),
		fontsize         : settings.getSmart('fontsize', 15),
		notesDisplayOrder: 'updatedAt'
	},
	components: {
		'flashmessage'  : componentFlashmessage,
		'buckets'       : componentBuckets,
		'bucketsSpecial': componentBucketsSpecial,
		'notes'         : componentNotes,
		'modal'         : componentModal,
		'addNote'       : componentAddNote,
		'titleBar'      : componentTitleBar,
		'noteMenu'      : componentNoteMenu,
		'noteFooter'    : componentNoteFooter,
		'handlerStack'  : componentHandlerStack,
		'handlerNotes'  : componentHandlerNotes,
		'codemirror'    : componentCodeMirror,
		'outline'       : componentOutline,
		'tabsBar'       : componentTabsBar,
		'themeEditor'   : componentThemeEditor,
		'themeMenu'     : componentThemeMenu
	},
	computed: {
		racks() {
			return this.$store.state.buckets
		},
		notes() {
			return this.$store.state.notes
		},
		images() {
			return this.$store.state.images
		},
		selectedRack: {
			get() {
				return this.$store.state.selectedBucket
			},
			set(bucket) {
				this.$store.commit('selectBucket', bucket)
			}
		},
		selectedFolder: {
			get() {
				return this.$store.state.selectedFolder
			},
			set(folder) {
				this.$store.commit('selectFolder', folder)
			}
		},
		selectedNote: {
			get() {
				return this.$store.state.selectedNote
			},
			set(note) {
				this.$store.commit('selectNote', note)
			}
		},
		notesHistory() {
			return this.$store.getters.notesHistory
		},
		draggingBucket() {
			return this.$store.state.draggingBucket
		},
		draggingFolder() {
			return this.$store.state.draggingFolder
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
		showNoteContainer() {
			return this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected
		},
		showFolderNotesList() {
			return !this.$store.state.draggingFolder && (this.selectedFolder || this.showAll || this.showFavorites)
		},
		mainCellClass() {
			var classes = ['font' + this.fontsize]
			if (this.noteTabs.length > 1) classes.push('tabs-open')
			if (this.isFullWidthNote) classes.push('full-note')
			if (this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected) classes.push('note-open')
			if (!this.isToolbarEnabled) classes.push('notebar-disabled')
			return classes
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
			ipcRenderer.send('load-racks', { library: models.getBaseLibraryPath() })

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

		ipcRenderer.on('loaded-racks', (event, data) => {
			if (!data || !data.racks) return

			this.$store.dispatch('loadedRacks', data.racks)

			this.quickNotesBucket = this.$store.getters.quickNotesBucket
			this.loadedRack = true
		})

		ipcRenderer.on('loaded-folders', (event, data) => {
			if (!data) return

			data.forEach((r) => {
				var rack = this.$store.getters.findBucketByPath(r.rack)
				var folders = []
				r.folders.forEach((f) => {
					f.rack = rack
					folders.push(new models.Folder(f))
				})

				rack.folders = arr.sortBy(folders.slice(), 'ordering', true)
			})
		})

		const loadByParent = (obj, rack, parent) => {
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
				var notes = []
				obj.notes.forEach((n) => {
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

				var images = []
				obj.images.forEach((img) => {
					img.rack = rack
					img.folder = folder
					images.push(new models.Image(img))
				})

				folder.notes = notes
				folder.images = images
				this.$store.dispatch('addNotes', notes)
				this.$store.dispatch('addImages', images)

				if (obj.subnotes && obj.subnotes.length > 0) {
					obj.subnotes.forEach((r) => {
						loadByParent(r, rack, folder)
					})
				}
			}
		}

		ipcRenderer.on('loaded-notes', (event, data) => {
			if (!data) return

			var rack
			data.forEach((r) => {
				if (!rack || rack.path !== r.rack) {
					rack = this.$store.getters.findBucketByPath(r.rack)
				}
				loadByParent(r, rack)
			})
		})

		ipcRenderer.on('loaded-all-notes', (event, data) => {
			if (!data) return

			traymenu.init()
			titleMenu.init()

			if (this.notes.length === 1) {
				this.changeNote({ note: this.notes[0] })

			} else if (remote.getGlobal('argv')) {
				const argv = remote.getGlobal('argv')
				if (argv.length > 1 && path.extname(argv[1]) === '.md' && fs.existsSync(argv[1])) {
					const openedNote = this.$store.getters.findNoteByPath(argv[1])
					if (openedNote) {
						this.changeNote({ note: openedNote })
					} else {
						elosenv.console.error('Path not valid')
					}
				}
			}
		})

		ipcRenderer.on('database-cleaned', (event, data) => {
			if (data && data.num) {
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

		ipcRenderer.on('download-files-failed', (event, data) => {
			if (!data.replaced || data.replaced.length === 0) return
			var noteObj = this.$store.getters.findNoteByPath(data.note)
			if (noteObj) {
				for (let i=0; i<data.replaced.length; i++) {
					var subStr = data.replaced[i]
					noteObj.body = noteObj.body.replace(subStr.new, subStr.original)
				}
			}
			this.sendFlashMessage({
				time : 5000,
				level: 'error',
				text : data.error
			})
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
	},
	methods: {
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
		/**
		 * scrolls to the top of the selected note.
		 * @function scrollUpScrollbarNote
		 * @return {Void} Function doesn't return anything
		 */
		scrollUpScrollbarNote() {
			this.$nextTick(() => {
				this.$refs.myEditor.scrollTop = 0
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

			if (folder.notes && folder.notes.length > 0) {
				let loadedCount = 0
				const noteObjects = []
				for (let i=0; i < folder.notes.length && loadedCount < 5; i++) {
					const note = folder.notes[i]
					if (!note.loaded) {
						loadedCount += 1
						if (note.loadBody()) {
							noteObjects.push(note.getObjectDB(models.getBaseLibraryPath()))
						}
					}
				}

				if (noteObjects.length > 0) {
					ipcRenderer.send('cache-notes', {
						library: models.getBaseLibraryPath(),
						notes  : noteObjects
					})
				}
			}
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
			if (this.isNoteSelected && this.selectedNote && this.selectedNote !== note) {
				this.selectedNote.saveModel()
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
				this.noteTabs.push(note)
			} else if (this.noteTabs.indexOf(note) === -1) {
				if (newtab) {
					this.noteTabs.push(note)
				}

				if (!newtab && this.selectedNote) {
					var ci = this.noteTabs.indexOf(this.selectedNote)
					this.noteTabs.splice(ci, 1, note)
				}
			}

			if (note instanceof models.Outline) {
				this.selectedNote = note
			} else {
				if (!note.loaded) {
					if (note.loadBody()) {
						ipcRenderer.send('cache-note', note.getObjectDB(models.getBaseLibraryPath()))
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
			this.$store.dispatch('removeBucket', rack)

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

			this.$store.dispatch('removeNote', note)
			if (this.selectedNote === note) {
				this.selectedNote = null
			}

			if (note.remove()) {
				ipcRenderer.send('delete-note', {
					library: models.getBaseLibraryPath(),
					path   : note.path
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
				this.$store.dispatch('addNewBucket', this.quickNotesBucket)
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
			settings.set('vue_isFullScreen', this.isFullScreen)
			this.update_editor_size()
		},
		toggleToolbar() {
			this.isToolbarEnabled = !this.isToolbarEnabled
			settings.set('toolbarNote', this.isToolbarEnabled)
		},
		toggleFullWidth() {
			this.isFullWidthNote = !this.isFullWidthNote
			settings.set('fullWidthNote', this.isFullWidthNote)
		},
		/**
		 * @description toggles markdown note preview.
		 * @return {Void} Function doesn't return anything
		 */
		togglePreview() {
			this.isPreview = !this.isPreview
			this.updatePreview()
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
				this.$store.dispatch('addNewNote', newNote)
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
				this.$store.dispatch('addNewNote', newOutline)
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
				this.$store.dispatch('addNewNote', newNote)
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
			let result
			if (this.selectedNote) {
				result = this.selectedNote.saveModel()
			}
			if (result && result.error && result.path) {
				this.sendFlashMessage({
					time : 5000,
					level: 'error',
					text : result.error
				})
			} else if (result && result.saved) {
				ipcRenderer.send('saved-note', this.selectedNote.getObjectDB(models.getBaseLibraryPath()))

				this.sendFlashMessage({
					time : 1000,
					level: 'info',
					text : 'Note saved'
				})
				if (this.selectedNote && this.notesDisplayOrder === 'updatedAt' && !this.showHistory) {
					this.scrollUpScrollbarNotes()
				}
			}
		}, 1000),
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

			var noteObj = this.$store.getters.findNoteByPath(href)
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
		/**
		 * displays context menu on the selected note in preview mode.
		 * @function previewMenu
		 * @return {Void} Function doesn't return anything
		 */
		previewMenu() {
			const menu = new Menu()

			menu.append(new MenuItem({
				label      : 'Copy',
				accelerator: 'CmdOrCtrl+C',
				click      : () => { document.execCommand('copy') }
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Copy to clipboard (Markdown)',
				click: () => {
					if (this.selectedNote) clipboard.writeText(this.selectedNote.bodyWithDataURL)
				}
			}))
			menu.append(new MenuItem({
				label: 'Copy to clipboard (HTML)',
				click: () => {
					if (this.preview) clipboard.writeText(this.preview)
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Toggle Preview',
				click: () => { this.togglePreview() }
			}))
			menu.popup()
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
			dialog.showOpenDialog({
				title      : 'Open Existing Sync Folder',
				defaultPath: currentPath || '/',
				properties : ['openDirectory', 'createDirectory']
			})
				.then(result => {
					if (result.canceled || !result.filePaths) {
						return
					}
					var newPath = result.filePaths[0]

					models.setBaseLibraryPath(newPath)
					settings.set('baseLibraryPath', newPath)
					remote.getCurrentWindow().reload()
				})
				.catch(err => {
					console.error(err)
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
		cleanDatabase() {
			ipcRenderer.send('clean-database', {
				library: models.getBaseLibraryPath()
			})
		},
		/**
		 * change how notes are sorted in the sidebar
		 * @function changeDisplayOrder
		 * @param  {String}  value   The sort by field
		 * @return {Void} Function doesn't return anything
		 */
		changeDisplayOrder(value) {
			var allowedOrders = ['updatedAt', 'createdAt', 'title']
			if (allowedOrders.indexOf(value) >= 0) {
				this.notesDisplayOrder = value
			}
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
		sidebarDrag() {
			this.update_editor_size()
		},
		sidebarDragEnd() {
			this.update_editor_size()
			this.save_editor_size()
		},
		updatePreview(noScroll) {
			if (this.isPreview && this.selectedNote) {
				this.preview = preview.render(this.selectedNote, this)
				if (noScroll === undefined) this.scrollUpScrollbarNote()
			} else {
				this.preview = ''
			}
		},
		closingWindow(quit) {
			settings.saveWindowSize()
			if (quit) {
				remote.app.quit()
			} else {
				var win = remote.getCurrentWindow()
				win.hide()
			}
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
				document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft + 'px'
			} else {
				document.querySelector('.main-cell-container').style.marginLeft = ''
			}
		}, 100)
	},
	watch: {
		fontsize() {
			settings.set('fontsize', this.fontsize)
			if (this.selectedNote) {
				this.$nextTick(() => {
					this.$refs.refCodeMirror.refreshCM()
				})
			}
		},
		keepHistory() {
			settings.set('keepHistory', this.keepHistory)
		},
		useMonospace() {
			settings.set('useMonospace', this.useMonospace)
		},
		reduceToTray() {
			settings.set('reduceToTray', this.reduceToTray)
		},
		selectedNote() {
			if (this.selectedNote instanceof models.Note) {
				this.updatePreview()
			}
		},
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
