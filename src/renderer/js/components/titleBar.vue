<template lang="pug">
	.title-bar
</template>

<script>
import _ from 'lodash'

import { ipcRenderer, remote } from 'electron'
const { Menu } = remote

import elosenv from '../utils/elosenv'
import { Rack } from '../models'

export default {
	name : 'titleBar',
	props: {
		'showMenuBar'   : Boolean,
		'libraryPath'   : String,
		'isNoteSelected': Boolean,
		'currentTheme'  : String,
		'windowTitle'   : String
	},
	data: function() {
		return {
			'isLinux'    : elosenv.isLinux(),
			'isDarwin'   : elosenv.isDarwin(),
			'focusSearch': false,
			'query'      : ''
		}
	},
	computed: {
		isFullWidthNote: {
			get() {
				return this.$store.state.options.isFullWidthNote
			},
			set(val) {
				this.$store.commit('options/setFullWidthNote', val)
			}
		},
		isToolbarEnabled: {
			get() {
				return this.$store.state.options.isToolbarEnabled
			},
			set(val) {
				this.$store.commit('options/setToolbarEnabled', val)
			}
		},
		reduceToTray: {
			get() {
				return this.$store.state.options.reduceToTray
			},
			set(val) {
				this.$store.commit('options/setReduceToTrayFlag', val)
				ipcRenderer.send('trayicon-minimize', this.reduceToTray)
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
		isPreview: {
			get() {
				return this.$store.state.options.isPreview
			}
		},
		isFullScreen: {
			get() {
				return this.$store.state.options.isFullScreen
			}
		},

		fileMenu() {
			return [
				{
					label: 'Save Database',
					click: () => {
						this.$root.saveDatabase()
					}
				},
				{ type: 'separator' },
				{
					label: 'About',
					click: () => {
						this.$root.openAbout()
					}
				},
				{ type: 'separator' },
				{
					label: 'Quit',
					click: () => {
						this.$root.closingWindow(true)
					}
				}
			]
		},
		libraryMenu() {
			return [
				{
					label: 'New Bucket',
					click: () => {
						this.newBucket()
					}
				},
				{ type: 'separator' },
				{
					label: 'Reload Library',
					click: () => {
						this.$root.reloadLibrary()
					}
				},
				{
					label: 'Select Library Directory',
					click: () => {
						this.$root.openSync()
					}
				},
				{
					label: 'Move Library Directory',
					click: () => {
						this.$root.moveSync()
					}
				}
			]
		},
		editMenu() {
			return [
				{
					label      : 'Undo',
					accelerator: 'CmdOrCtrl+Z',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-undo')
					}
				},
				{
					label      : 'Redo',
					accelerator: 'CmdOrCtrl+Y',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-redo')
					}
				},
				{ type: 'separator' },
				{
					label      : 'Cut',
					accelerator: 'CmdOrCtrl+X',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-cut')
					}
				},
				{
					label      : 'Copy',
					accelerator: 'CmdOrCtrl+C',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-copy')
					}
				},
				{
					label      : 'Paste',
					accelerator: 'CmdOrCtrl+V',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-paste')
					}
				},
				{ type: 'separator' },
				{
					label      : 'Select All',
					accelerator: 'CmdOrCtrl+A',
					selector   : 'selectAll:'
				},
				{ type: 'separator' },
				{
					label      : 'Find in Note',
					accelerator: 'CmdOrCtrl+F',
					enabled    : this.isNoteSelected && !this.isPreview,
					click      : () => {
						window.bus.$emit('codemirror-find')
					}
				}
			]
		},
		viewMenu() {
			return [
				{
					label: 'Toggle sidebar',
					click: () => {
						this.$root.setFullScreen(!this.isFullScreen)
					}
				},
				{ type: 'separator' },
				{
					label  : 'Notes Order',
					submenu: this.sortSubmenu
				},
				{ type: 'separator' },
				{
					type   : 'checkbox',
					label  : 'Show Note Toolbar',
					checked: this.isToolbarEnabled,
					click  : () => {
						this.isToolbarEnabled = !this.isToolbarEnabled
					}
				},
				{
					type   : 'checkbox',
					label  : 'Show Note Full Width',
					checked: this.isFullWidthNote,
					click  : () => {
						this.isFullWidthNote = !this.isFullWidthNote
					}
				},
				{ type: 'separator' },
				{
					label  : 'Theme',
					submenu: this.themesSubmenu
				}
			]
		},
		toolsMenu() {
			return [
				{
					label: 'Clean Database',
					click: () => {
						this.$root.cleanDatabase()
					}
				},
				{
					label: 'Reload Window',
					click: () => {
						Menu.setApplicationMenu(null)
						remote.getCurrentWindow().reload()
					}
				},
				{ type: 'separator' },
				{
					type   : 'checkbox',
					label  : 'Reduce to Tray',
					checked: this.reduceToTray,
					click  : () => {
						this.reduceToTray = !this.reduceToTray
					}
				},
				{
					label: 'Reset Sidebar Width',
					click: () => {
						this.resetSidebar()
					}
				}
			]
		},
		sortSubmenu() {
			return [
				{
					type   : 'radio',
					label  : 'Sort by Update Date',
					checked: this.notesDisplayOrder === 'updatedAt',
					click  : () => {
						this.notesDisplayOrder = 'updatedAt'
					}
				},
				{
					type   : 'radio',
					label  : 'Sort by Creation Date',
					checked: this.notesDisplayOrder === 'createdAt',
					click  : () => {
						this.notesDisplayOrder = 'createdAt'
					}
				},
				{
					type   : 'radio',
					label  : 'Sort by Title',
					checked: this.notesDisplayOrder === 'title',
					click  : () => {
						this.notesDisplayOrder = 'title'
					}
				}
			]
		},
		themesSubmenu() {
			return [
				{
					type   : 'checkbox',
					label  : 'Dark',
					checked: this.currentTheme === 'dark',
					click  : () => {
						this.$root.setCustomTheme('dark')
					}
				},
				{
					type   : 'checkbox',
					label  : 'Arc Dark',
					checked: this.currentTheme === 'arc-dark',
					click  : () => {
						this.$root.setCustomTheme('arc-dark')
					}
				},
				{ type: 'separator' },
				{
					label: 'Edit Theme',
					click: () => {
						this.$root.editThemeView()
					}
				},
				{
					label: 'Load Custom Theme',
					click: () => {
						this.$root.loadThemeFromFile()
					}
				}
			]
		}
	},
	mounted() {
		this.initApplicationMenu()
	},
	updated() {
		this.initApplicationMenu()
	},
	methods: {
		initApplicationMenu: _.debounce(function () {
			if (this.windowTitle) {
				remote.getCurrentWindow().setTitle(this.windowTitle)
			}

			if (this.showMenuBar) {
				const menuItems = [
					{
						label  : 'File',
						submenu: this.fileMenu
					},
					{
						label  : 'Library',
						submenu: this.libraryMenu
					},
					{
						label  : 'Edit',
						submenu: this.editMenu
					},
					{
						label  : 'View',
						submenu: this.viewMenu
					},
					{
						label  : 'Tools',
						submenu: this.toolsMenu
					}
				]

				const menu = Menu.buildFromTemplate(menuItems)
				Menu.setApplicationMenu(menu)
			}
		}, 200),
		win_close() {
			this.$root.closingWindow(!this.reduceToTray)
		},
		resetSidebar() {
			this.$root.racksWidth = 220
			this.$root.notesWidth = 220
			this.$root.init_sidebar_width()
			this.$nextTick(() => {
				this.$root.save_editor_size()
			})
		},
		quick_note() {
			this.$root.newQuickNote()
		},
		onSearchFocus() {
			this.focusSearch = true
		},
		onSearchBlur() {
			this.focusSearch = false
		},
		clearSearch() {
			this.focusSearch = false
			this.query = ''
		},
		newBucket() {
			var bucket = new Rack({
				name    : '',
				ordering: 0
			})
			this.$store.dispatch('library/addNewBucket', bucket)
			this.$root.setEditingRack(bucket)
		}
	},
	watch: {
		currentTheme() {
			this.initApplicationMenu()
		},
		notesDisplayOrder() {
			this.initApplicationMenu()
		},
		reduceToTray() {
			this.initApplicationMenu()
		},
		isFullWidthNote() {
			this.initApplicationMenu()
		},
		isToolbarEnabled() {
			this.initApplicationMenu()
		},
		isNoteSelected() {
			this.initApplicationMenu()
		},
		isPreview() {
			this.initApplicationMenu()
		}
		/*query() {
			this.$root.search = this.query.length > 2 ? this.query : ''
		}*/
	}
}
</script>
