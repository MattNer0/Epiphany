<template lang="pug">
	.my-notes
		.my-separator(v-for="separated in notesFiltered", v-bind:key="separated.dateStr")
			.my-separator-date {{ separated.dateStr }}
			.my-notes-note(v-for="note in separated.notes",
				track-by="uid",
				@click="selectNote(note)",
				v-on:auxclick.stop.prevent="selectNote(note, true)"
				@contextmenu.prevent.stop="noteMenu(note)",
				@dragstart.stop="noteDragStart($event, note)",
				@dragend.stop="noteDragEnd()",
				:class="{'my-notes-note-selected': selectedNote === note, 'sortUpper': note.sortUpper, 'sortLower': note.sortLower}",
				draggable="true")

				h5.my-notes-note-title(v-if="note.title")
					i.coon-lock(v-if="note.isEncryptedNote && note.isEncrypted")
					i.coon-unlock(v-else-if="note.isEncryptedNote && !note.isEncrypted")
					i.coon-file-star(v-else-if="note.starred")
					i.coon-file-outline(v-else-if="note.isOutline")
					i.coon-file-text(v-else)
					| {{ note.title }}
				h5.my-notes-note-title(v-else)
					i.coon-file-text
					| No Title
				.my-notes-note-image(v-if="note.img")
					img(:src="note.img")
				.my-notes-note-body(v-else)
					| {{ note.bodyPreview | truncate(80) }}

</template>

<script>
import fs from 'fs'
import Vue from 'vue'

import fileUtils from '../utils/file'

// Electron things
import { remote, clipboard, shell } from 'electron'
const { Menu, MenuItem, dialog } = remote
import { Note } from '../models'

import preview from '../preview'

import truncate from '../filters/truncate'
import dateSplitted from '../filters/dateSplitted'

Vue.use(truncate)
Vue.use(dateSplitted)

export default {
	name : 'notes',
	props: {
		'notesDisplayOrder': String,
		'notes'            : Array,
		'showHistory'      : Boolean
	},
	data() {
		return {
			'addnote_visible': false,
			'clicks'         : 0,
			'clickDelay'     : 500,
			'clickTimer'     : null,
			'position'       : ['left', 'top', 'left', 'top']
		}
	},
	computed: {
		selectedRack() {
			return this.$store.state.selectedBucket
		},
		selectedFolder() {
			return this.$store.state.selectedFolder
		},
		selectedNote() {
			return this.$store.state.selectedNote
		},
		draggingNote() {
			return this.$store.state.draggingNote
		},
		notesFiltered() {
			var dateSeparated = Vue.filter('dateSeparated')
			return dateSeparated(this.notes.slice(), this.notesDisplayOrder)
		}
	},
	methods: {
		selectNote(note, newtab) {
			this.clicks++
			if (this.clicks === 1) {
				this.clickTimer = setTimeout(() => {
					window.bus.$emit('change-note', { note: note, newtab: newtab, sidebar: true })
					this.clicks = 0
				}, this.clickDelay)
			} else {
				clearTimeout(this.clickTimer)
				this.selectNoteAndWide(note)
				this.clicks = 0
			}
		},
		selectNoteAndWide(note) {
			if (this.selectedNote !== note) {
				window.bus.$emit('change-note', { note: note, newtab: false, sidebar: true })
				window.bus.$emit('toggle-fullscreen')
			} else {
				window.bus.$emit('toggle-fullscreen')
			}
		},
		removeNote(note) {
			var dialogOptions = {
				type     : 'question',
				buttons  : ['Delete', 'Cancel'],
				defaultId: 1,
				cancelId : 1
			}

			dialogOptions.title = 'Remove Note'
			dialogOptions.message = 'Are you sure you want to remove this note?\n\nTitle: ' + note.title + '\nContent: ' + note.bodyWithoutTitle.replace('\n', ' ').slice(0, 100) + '...'

			return dialog.showMessageBox(dialogOptions)
				.then(({ response }) => {
					if (response === 0) {
						this.$root.deleteNote(note)
						if (this.notes.length === 1) {
							window.bus.$emit('change-note', { note: this.notes[0] })
						} else if (this.notes.length > 1) {
							window.bus.$emit('change-note', {
								note: Note.beforeNote(this.notes.slice(), note, this.notesDisplayOrder)
							})
						} else {
							window.bus.$emit('change-note', { note: null })
						}

					}
				})
		},
		// Dragging
		noteDragStart(event, note) {
			event.dataTransfer.setDragImage(event.target, 0, 0)
			this.$store.commit('dragging', note)
		},
		noteDragEnd() {
			this.$store.commit('dragging')
		},
		copyNoteBody(note) {
			clipboard.writeText(note.bodyWithDataURL)
			window.bus.$emit('flash-message', {
				time : 1000,
				level: 'info',
				text : 'Copied Markdown to clipboard'
			})
		},
		copyNoteHTML(note) {
			clipboard.writeText(preview.render(note, this))
			window.bus.$emit('flash-message', {
				time : 1000,
				level: 'info',
				text : 'Copied HTML to clipboard'
			})
		},
		copyOutlinePLain(note) {
			if (note.isOutline) {
				clipboard.writeText(note.bodyWithoutMetadata)
				window.bus.$emit('flash-message', {
					time : 1000,
					level: 'info',
					text : 'Copied Plain Text to clipboard'
				})
			}
		},
		copyOutlineOPML(note) {
			if (note.isOutline) {
				clipboard.writeText(note.compileOutlineBody())
				window.bus.$emit('flash-message', {
					time : 1000,
					level: 'info',
					text : 'Copied OPML to clipboard'
				})
			}
		},
		copyNotePath(note) {
			clipboard.writeText('coon://library/'+encodeURIComponent(note.relativePath))
			window.bus.$emit('flash-message', {
				time : 1000,
				level: 'info',
				text : 'Copied Note Path to clipboard'
			})
		},
		exportNoteDiag(note) {
			var filename = fileUtils.safeName(note.title) + '.md'
			if (note.isOutline) {
				filename = fileUtils.safeName(note.title) + '.opml'
			}

			dialog.showSaveDialog({
				title      : 'Export Note',
				defaultPath: filename
			})
				.then(result => {
					if (result.canceled || !result.filePath) {
						return
					}
					const notePath = result.filePath

					try {
						var fd = fs.openSync(notePath, 'w')
						if (note.isOutline) {
							fs.writeSync(fd, note.compileOutlineBody())
						} else {
							fs.writeSync(fd, note.bodyWithDataURL)
						}
						fs.closeSync(fd)
						window.bus.$emit('flash-message', {
							time : 1000,
							level: 'info',
							text : 'Note exported'
						})
					} catch (e) {
						fs.closeSync(fd)
						window.bus.$emit('flash-message', {
							time : 5000,
							level: 'error',
							text : 'File "' + filename + '" already exists, skipped'
						})
					}
				})
				.catch(err => {
					console.error(err)
				})
		},
		noteMenu(note) {
			var menu = new Menu()

			if (this.selectedNote && this.selectedNote === note) {
				menu.append(new MenuItem({ label: 'Close Note', click: () => { this.selectNote(null) } }))
				menu.append(new MenuItem({ type: 'separator' }))
			} else {
				menu.append(new MenuItem({ label: 'Open Note', click: () => { this.selectNote(note) } }))
				menu.append(new MenuItem({ label: 'Open Note in new Tab', click: () => { this.selectNote(note, true) } }))
				menu.append(new MenuItem({ type: 'separator' }))
			}

			if (this.showHistory) {
				menu.append(new MenuItem({
					label: 'Open and Close History',
					click: () => {
						window.bus.$emit('change-bucket', {
							bucket : note.rack,
							sidebar: true
						})
						this.selectNote(note)
						this.$root.isFullScreen = false
					}
				}))
				menu.append(new MenuItem({ type: 'separator' }))
			}

			if (note.starred) {
				menu.append(new MenuItem({
					label: 'Remove from Favorites',
					click: () => {
						note.starred = false
						note.saveModel()
					}
				}))
			} else {
				menu.append(new MenuItem({
					label: 'Add to Favorites',
					click: () => {
						note.starred = true
						note.saveModel()
					}
				}))
			}
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({ label: 'Copy Internal Link to clipboard', click: () => { this.copyNotePath(note) } }))
			menu.append(new MenuItem({ type: 'separator' }))
			if (note.isOutline) {
				menu.append(new MenuItem({ label: 'Copy to clipboard (Plain)', click: () => { this.copyOutlinePLain(note) } }))
				menu.append(new MenuItem({ label: 'Copy to clipboard (OPML)', click: () => { this.copyOutlineOPML(note) } }))
			} else {
				menu.append(new MenuItem({ label: 'Copy to clipboard (Markdown)', click: () => { this.copyNoteBody(note) } }))
				menu.append(new MenuItem({ label: 'Copy to clipboard (HTML)', click: () => { this.copyNoteHTML(note) } }))
			}
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Show this note in folder',
				click: () => {
					shell.showItemInFolder(note.data.path)
				}
			}))
			menu.append(new MenuItem({
				label: 'Show this note\'s image folder',
				click: () => {
					shell.openPath(note.imagePath).then(err => {
						if (err) {
							window.bus.$emit('flash-message', {
								time : 5000,
								level: 'error',
								text : 'Image folder doesn\'t exist.'
							})
						}
					})
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({ label: 'Export this note...', click: () => { this.exportNoteDiag(note) } }))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({ label: 'Delete note', click: () => { this.removeNote(note) } }))
			menu.popup()
		}
	}
}
</script>
