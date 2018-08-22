<template lang="pug">
	.my-notes
		.my-separator(v-for="separated in notesFiltered", v-bind:key="separated.dateStr")
			.my-separator-date {{ separated.dateStr }}
			.my-notes-note(v-for="note in separated.notes",
				track-by="uid",
				@click="selectNote(note)",
				@dblclick="selectNoteAndWide(note)",
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
				.my-notes-note-body(v-if="!note.img && note.body.length != 0")
					| {{ note.bodyWithoutTitle | truncate(80) }}

</template>

<script>
	import fs from "fs";
	import Vue from "vue";

	import fileUtils from "../utils/file";
	import arr from "../utils/arr";
	import dragging from "../utils/dragging";

	// Electron things
	import { remote, clipboard, shell } from "electron";
	const { Menu, MenuItem, dialog } = remote;

	import preview from "../preview";

	import models from "../models";
	const Note = models.Note;

	import truncate from "../filters/truncate";
	import dateSplitted from "../filters/dateSplitted";

	Vue.use(truncate);
	Vue.use(dateSplitted);

	export default {
		name: 'notes',
		props: {
			'notesDisplayOrder'   : String,
			'notes'               : Array,
			'originalNotes'       : Array,
			'selectedNote'        : Object,
			'selectedRack'        : Object,
			'selectedFolder'      : Object,
			'draggingNote'        : Object,
			'toggleFullScreen'    : Function,
			'changeNote'          : Function,
			'setDraggingNote'     : Function,
			'showHistory'         : Boolean,
			'showSearch'          : Boolean
		},
		data() {
			return {
				'addnote_visible': false,
				'position': [ "left", "top", "left", "top" ]
			};
		},
		computed: {
			notesFiltered() {
				var dateSeparated = Vue.filter('dateSeparated');
				return dateSeparated(this.notes.slice(), this.notesDisplayOrder);
			}
		},
		methods: {
			selectNote(note, newtab) {
				this.changeNote(note, newtab, true);
			},
			selectNoteAndWide(note) {
				if (this.selectedNote != note) {
					this.changeNote(note, false, true);
					this.toggleFullScreen();
				} else {
					this.changeNote(note, false, true);
				}
			},
			removeNote(note) {
				var dialog_options = {
					type     : 'question',
					buttons  : ['Delete', 'Cancel'],
					defaultId: 1,
					cancelId : 1
				};

				dialog_options.title = 'Remove Note';
				dialog_options.message = 'Are you sure you want to remove this note?\n\nTitle: ' + note.title + '\nContent: ' + note.bodyWithoutTitle.replace('\n', ' ').slice(0, 100) + '...';

				dialog.showMessageBox(remote.getCurrentWindow(), dialog_options, (btn) => {
					if (btn == 0) {
						this.$root.deleteNote(note);
						if (this.notes.length == 1) {
							this.changeNote(this.notes[0]);
						} else if (this.notes.length > 1) {
							this.changeNote(Note.beforeNote(this.notes.slice(), note, this.notesDisplayOrder));
						} else {
							this.changeNote(null);
						}
						
					}
				});
			},
			// Dragging
			noteDragStart(event, note) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.setDraggingNote(note);
			},
			noteDragEnd() {
				this.setDraggingNote(null);
			},
			copyNoteBody(note) {
				clipboard.writeText(note.bodyWithDataURL);
				this.$root.sendFlashMessage(1000, 'info', 'Copied Markdown to clipboard');
			},
			copyNoteHTML(note) {
				clipboard.writeText(preview.render(note.body, Vue));
				this.$root.sendFlashMessage(1000, 'info', 'Copied HTML to clipboard');
			},
			copyOutlinePLain(note) {
				if (note.isOutline) {
					clipboard.writeText(note.bodyWithoutMetadata);
					this.$root.sendFlashMessage(1000, 'info', 'Copied Text Plain to clipboard');
				}
			},
			copyOutlineOPML(note) {
				if (note.isOutline) {
					clipboard.writeText(note.compileOutlineBody());
					this.$root.sendFlashMessage(1000, 'info', 'Copied Text Plain to clipboard');
				}
			},
			copyNotePath(note) {
				clipboard.writeText("coon://library/"+encodeURIComponent(note.relativePath));
				this.$root.sendFlashMessage(1000, 'info', 'Copied Note Path to clipboard');
			},
			exportNoteDiag(note) {
				var filename = fileUtils.safeName(note.title) + '.md';
				if (note.isOutline) {
					filename = fileUtils.safeName(note.title) + '.opml';
				}
				var notePath = dialog.showSaveDialog(remote.getCurrentWindow(), {
					title      : 'Export Note',
					defaultPath: filename
				});
				if (!notePath) {
					return null;
				}
				try {
					var fd = fs.openSync(notePath, 'w');
					if (note.isOutline) {
						fs.writeSync(fd, note.compileOutlineBody());
					} else {
						fs.writeSync(fd, note.bodyWithDataURL);
					}
				} catch (e) {
					this.$root.sendFlashMessage(5000, 'error', 'Skipped: File "' + filename + '" already exists');
				}
				fs.closeSync(fd);
			},
			noteMenu(note) {
				var menu = new Menu();

				if (this.selectedNote && this.selectedNote == note) {
					menu.append(new MenuItem({label: 'Close Note', click: () => {this.selectNote(null)}}));
					menu.append(new MenuItem({type: 'separator'}));
				} else {
					menu.append(new MenuItem({label: 'Open Note', click: () => {this.selectNote(note)}}));
					menu.append(new MenuItem({label: 'Open Note in new Tab', click: () => {this.selectNote(note, true)}}));
					menu.append(new MenuItem({type: 'separator'}));
				}

				if (this.showHistory) {
					menu.append(new MenuItem({label: 'Open and Close History', click: () => {
						this.$root.changeRack(note.rack, true);
						this.selectNote(note);
						this.$root.isFullScreen = false;
					}}));
					menu.append(new MenuItem({type: 'separator'}));
				}

				if (this.showSearch) {
					menu.append(new MenuItem({label: 'Open and Close Search', click: () => {
						this.$root.changeRack(note.rack, true);
						this.selectNote(note);
						this.$root.isFullScreen = false;
					}}));
					menu.append(new MenuItem({type: 'separator'}));
				}

				if (note.starred) {
					menu.append(new MenuItem({label: 'Remove from Favorites', click: () => {
						note.starred = false;
						note.saveModel();
					}}));
				} else {
					menu.append(new MenuItem({label: 'Add to Favorites', click: () => {
						note.starred = true;
						note.saveModel();
					}}));
				}
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Copy Internal Link to clipboard', click: () => {this.copyNotePath(note)}}));
				menu.append(new MenuItem({type: 'separator'}));
				if (note.isOutline) {
					menu.append(new MenuItem({label: 'Copy to clipboard (Plain)', click: () => {this.copyOutlinePLain(note)}}));
					menu.append(new MenuItem({label: 'Copy to clipboard (OPML)', click: () => {this.copyOutlineOPML(note)}}));
				} else {
					menu.append(new MenuItem({label: 'Copy to clipboard (Markdown)', click: () => {this.copyNoteBody(note)}}));
					menu.append(new MenuItem({label: 'Copy to clipboard (HTML)', click: () => {this.copyNoteHTML(note)}}));
				}
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Show this note in folder',
					click: () => {
						shell.showItemInFolder(note.data.path);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Export this note...', click: () => {this.exportNoteDiag(note)}}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Delete note', click: () => {this.removeNote(note)}}));

				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>