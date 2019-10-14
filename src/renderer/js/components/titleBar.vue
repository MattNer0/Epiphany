<template lang="pug">
	.title-bar-container
		.title-bar
			.menu-bar
				span.address-bar(v-if="windowTitle") {{ windowTitle }}
				nav(v-else-if="showMenuBar")
					ul
						li.icon
						li(@click="file_menu") File
						li(@click="edit_menu") Edit
						li(@click="view_menu") View
						li(@click="tools_menu") Tools
						li(@click="quick_note")
							i.coon-plus
							span New Quick Note
						li(@click="open_sidebar", v-if="isFullScreen")
							i.coon-sidebar
							span Open Sidebar
						li(@click="close_sidebar", v-else)
							i.coon-sidebar
							span Close Sidebar
						li(v-bind:class="{ 'open-search' : focusSearch || query, 'close-search': !focusSearch && !query }")
							label
								i.coon-search
								input(type="text", placeholder="Search", v-model="query" @focus="onSearchFocus", @blur="onSearchBlur")
								i.coon-x-circle(v-show="query", @click="clearSearch")

				.system-icons(:class="{ 'darwin': isDarwin, 'popup' : windowTitle }")
					.system-icon(@click="win_min", v-if="!windowTitle")
						i.coon-underscore
					.system-icon(@click="win_max", v-if="!windowTitle")
						i.coon-square
					.system-icon.close-icon(@click="win_close")
						i.coon-x
</template>

<script>
import { remote } from 'electron'
const { Menu, MenuItem } = remote

import elosenv from '../utils/elosenv'
import { Rack } from '../models'

export default {
	name : 'titleBar',
	props: {
		'reduceToTray'     : Boolean,
		'isFullScreen'     : Boolean,
		'showMenuBar'      : Boolean,
		'libraryPath'      : String,
		'notesDisplayOrder': String,
		'isToolbarEnabled' : Boolean,
		'isFullWidthNote'  : Boolean,
		'isNoteSelected'   : Boolean,
		'isPreview'        : Boolean,
		'currentTheme'     : String,
		'windowTitle'      : String
	},
	data: function() {
		return {
			'isLinux'    : elosenv.isLinux(),
			'isDarwin'   : elosenv.isDarwin(),
			'focusSearch': false,
			'query'      : ''
		}
	},
	methods: {
		win_close() {
			this.$root.closingWindow(!this.reduceToTray)
		},
		win_max() {
			var win = remote.getCurrentWindow()
			if (win.isMaximized()) {
				win.unmaximize()
			} else {
				win.maximize()
			}
		},
		win_min() {
			var win = remote.getCurrentWindow()
			win.minimize()
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
		open_sidebar() {
			this.$root.setFullScreen(false)
		},
		close_sidebar() {
			this.$root.setFullScreen(true)
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
			this.$store.dispatch('addNewBucket', bucket)
			this.$root.setEditingRack(bucket)
		},
		popup_position(event) {
			var rect = event.target.getBoundingClientRect()
			return {
				window: remote.getCurrentWindow(),
				x     : Math.floor(rect.x),
				y     : Math.floor(rect.y)+event.target.offsetHeight
			}
		},
		file_menu(event) {
			var menu = new Menu()

			menu.append(new MenuItem({
				label: 'New Bucket',
				click: () => {
					this.newBucket()
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Select Library Directory',
				click: () => {
					this.$root.openSync()
				}
			}))
			menu.append(new MenuItem({
				label: 'Move Library Directory',
				click: () => {
					this.$root.moveSync()
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'About',
				click: () => {
					this.$root.openAbout()
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Clean Database',
				click: () => {
					this.$root.cleanDatabase()
				}
			}))
			menu.append(new MenuItem({
				label: 'Reload',
				click: () => {
					remote.getCurrentWindow().reload()
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Quit',
				click: () => {
					this.$root.closingWindow(true)
				}
			}))

			menu.popup(this.popup_position(event))
		},
		themes_submenu() {
			var themesSubmenu = new Menu()
			themesSubmenu.append(new MenuItem({
				type   : 'checkbox',
				label  : 'Dark',
				checked: this.currentTheme === 'dark',
				click  : () => {
					this.$root.setCustomTheme('dark')
				}
			}))
			themesSubmenu.append(new MenuItem({
				type   : 'checkbox',
				label  : 'Arc Dark',
				checked: this.currentTheme === 'arc-dark',
				click  : () => {
					this.$root.setCustomTheme('arc-dark')
				}
			}))
			themesSubmenu.append(new MenuItem({ type: 'separator' }))
			themesSubmenu.append(new MenuItem({
				label: 'Edit Theme',
				click: () => {
					this.$root.editThemeView()
				}
			}))
			themesSubmenu.append(new MenuItem({
				label: 'Load Custom Theme',
				click: () => {
					this.$root.loadThemeFromFile()
				}
			}))
			return themesSubmenu
		},
		sort_submenu() {
			var sortSubmenu = new Menu()
			sortSubmenu.append(new MenuItem({
				type   : 'radio',
				label  : 'Sort by Update Date',
				checked: this.notesDisplayOrder === 'updatedAt',
				click  : () => {
					this.$root.changeDisplayOrder('updatedAt')
				}
			}))
			sortSubmenu.append(new MenuItem({
				type   : 'radio',
				label  : 'Sort by Creation Date',
				checked: this.notesDisplayOrder === 'createdAt',
				click  : () => {
					this.$root.changeDisplayOrder('createdAt')
				}
			}))
			sortSubmenu.append(new MenuItem({
				type   : 'radio',
				label  : 'Sort by Title',
				checked: this.notesDisplayOrder === 'title',
				click  : () => {
					this.$root.changeDisplayOrder('title')
				}
			}))
			return sortSubmenu
		},
		notes_submenu() {
			var notesSubmenu = new Menu()
			notesSubmenu.append(new MenuItem({
				type   : 'checkbox',
				label  : 'Show Note Toolbar',
				checked: this.isToolbarEnabled,
				click  : () => {
					this.$root.toggleToolbar()
				}
			}))
			notesSubmenu.append(new MenuItem({
				type   : 'checkbox',
				label  : 'Show Note Full Width',
				checked: this.isFullWidthNote,
				click  : () => {
					this.$root.toggleFullWidth()
				}
			}))

			return notesSubmenu
		},
		edit_menu(event) {
			var menu = new Menu()

			menu.append(new MenuItem({
				label      : 'Undo',
				accelerator: 'CmdOrCtrl+Z',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-undo')
				}
			}))

			menu.append(new MenuItem({
				label      : 'Redo',
				accelerator: 'CmdOrCtrl+Y',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-redo')
				}
			}))

			menu.append(new MenuItem({ type: 'separator' }))

			menu.append(new MenuItem({
				label      : 'Cut',
				accelerator: 'CmdOrCtrl+X',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-cut')
				}
			}))

			menu.append(new MenuItem({
				label      : 'Copy',
				accelerator: 'CmdOrCtrl+C',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-copy')
				}
			}))

			menu.append(new MenuItem({
				label      : 'Paste',
				accelerator: 'CmdOrCtrl+V',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-paste')
				}
			}))

			menu.append(new MenuItem({ type: 'separator' }))

			menu.append(new MenuItem({
				label      : 'Find in Note',
				accelerator: 'CmdOrCtrl+F',
				enabled    : this.isNoteSelected && !this.isPreview,
				click      : () => {
					window.bus.$emit('codemirror-find')
				}
			}))

			menu.popup(this.popup_position(event))
		},
		view_menu(event) {
			var menu = new Menu()

			menu.append(new MenuItem({
				label  : 'Notes Order',
				submenu: this.sort_submenu()
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label  : 'Notes',
				submenu: this.notes_submenu()
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label  : 'Theme',
				submenu: this.themes_submenu()
			}))

			menu.popup(this.popup_position(event))
		},
		tools_menu(event) {
			var menu = new Menu()

			menu.append(new MenuItem({
				type   : 'checkbox',
				label  : 'Reduce to Tray',
				checked: this.reduceToTray,
				click  : () => {
					this.$root.reduceToTray = !this.reduceToTray
				}
			}))
			menu.append(new MenuItem({
				label: 'Reset Sidebar Width',
				click: () => {
					this.resetSidebar()
				}
			}))

			menu.popup(this.popup_position(event))
		}
	},
	watch: {
		query() {
			this.$root.search = this.query.length > 2 ? this.query : ''
		}
	}
}
</script>
