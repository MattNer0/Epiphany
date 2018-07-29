<template lang="pug">
	.my-shelf-folders(v-if="parentFolder && parentFolder.folders && parentFolder.folders.length > 0")
		.my-shelf-folder(v-for="folder in parentFolder.folders"
			:class="classFolder(folder)"
			:draggable="editingFolder === null && parentFolder.uid ? 'true' : 'false'"
			@dragstart.stop="folderDragStart($event, parentFolder, folder)"
			@dragend.stop="folderDragEnd(folder)"
			@dragover.stop="folderDragOver($event, folder)"
			@dragleave="folderDragLeave(folder)"
			@drop="dropToFolder($event, parentFolder, folder)"
			@contextmenu.prevent.stop="folderMenu(parentFolder, folder)")
			.folder-object(
				:class="classFolderObject(folder)",
				@click="selectFolder(folder)")
				i.coon-play-right.down(@click.prevent.stop="folder.openFolder = !folder.openFolder")
				a.my-shelf-folder-name.no-name(v-if="editingFolder != folder.uid")
					template(v-if="folder.name")
						| {{ folder.name }}
					template(v-else)
						| No Title
					span.my-shelf-folder-badge(v-if="search", v-show="folder.searchnotes(search).length > 0")
						| {{ folder.searchnotes(search).length }} 
						i.coon-file
					span.my-shelf-folder-badge(v-else, v-show="folder.notes.length > 0")
						| {{ folder.notes.length }} 
						i.coon-file
					span.my-shelf-folder-badge(v-show="folder.images.length > 0")
						| {{ folder.images.length }} 
						i.coon-image
					span.my-shelf-folder-badge(v-show="folder.folders.length > 0")
						| {{ folder.folders.length }} 
						i.coon-folder
				input(v-if="editingFolder == folder.uid"
					v-model="folder.name"
					v-focus="editingFolder == folder.uid"
					@blur="doneFolderEdit(folder)"
					@keyup.enter="doneFolderEdit(folder)"
					@keyup.esc="doneFolderEdit(folder)"
					type="text")

			folders(v-if="folder.folders",
					:parent-folder="folder"
					:selected-folder="selectedFolder"
					:dragging-note="draggingNote"
					:change-bucket="changeBucket"
					:change-folder="changeFolder"
					:editing-folder="editingFolder"
					:dragging-folder="draggingFolder"
					:search="search")

</template>

<script>
	import { remote } from "electron";
	import Vue from "vue";
	import arr from "../utils/arr";
	import dragging from "../utils/dragging";
	import models from "../models";

	const { Menu, MenuItem } = remote;

	export default {
		name: 'folders',
		props: {
			'parentFolder'        : Object,
			'selectedNote'        : Object,
			'selectedFolder'      : Object,
			'draggingNote'        : Object,
			'draggingFolder'      : Object,
			'changeBucket'        : Function,
			'changeFolder'        : Function,
			'editingFolder'       : String,
			'search'              : String
		},
		data() {
			return {
				draggingFolderParent: null
			};
		},
		directives: {
			focus(element) {
				if (!element) return;
				Vue.nextTick(() => {
					element.focus();
				});
			}
		},
		computed: {
			isDraggingNote() {
				return !!this.draggingNote;
			}
		},
		methods: {
			classFolder(folder) {
				return {
					'isShelfSelected': (this.selectedFolder == folder && !this.isDraggingNote) || folder.dragHover,
					'gotSubfolders'  : folder.folders && folder.folders.length > 0,
					'openFolder'     : folder.openFolder,
					'noteDragging'   : this.isDraggingNote,
					'sortUpper'      : folder.sortUpper && !folder.sortLower,
					'sortLower'      : folder.sortLower && !folder.sortUpper,
					'sortInside'     : folder.sortLower && folder.sortUpper
				};
			},
			classFolderObject(folder) {
				return {
					'dragging'   : this.draggingFolder == folder,
					'no-results' : !this.draggingFolder && !this.draggingNote && this.search && folder.searchnotes(this.search).length == 0
				};
			},
			isRack(folder) {
				return folder instanceof models.Rack;
			},
			doneFolderEdit(folder) {
				if (!this.editingFolder) { return }
				folder.saveModel();
				this.changeFolder(folder);
			},
			selectFolder(folder) {
				if (this.selectedFolder == folder) {
					folder.openFolder = !folder.openFolder;
				} else {
					this.changeFolder(folder);
					if (!folder.openFolder) {
						folder.openFolder = true;
					}
				}
			},
			addFolder(parent) {
				var folder;
				if (!parent) parent = this.parentFolder;
				// @todo nested folder
				folder = new models.Folder({
					name        : '',
					rack        : parent.rack,
					parentFolder: parent instanceof models.Folder ? parent : undefined,
					ordering    : 0
				});
				this.$root.addFolderToRack(parent, folder);
				if (parent instanceof models.Folder) {
					parent.openFolder = true;
				}
				this.$root.setEditingFolder(folder);
			},
			folderDragStart(event, parent, folder) {
				event.dataTransfer.setDragImage(event.target, 8, 0);
				this.$root.setDraggingFolder(folder);
				this.draggingFolderParent = parent;
			},
			folderDragEnd() {
				this.$root.folderDragEnded(this.draggingFolderParent, this.draggingFolder);
				this.$root.setDraggingFolder();
				this.draggingFolderParent = null;
			},
			folderDragOver(event, folder) {
				if (this.draggingNote) {
					if (this.draggingNote.folder.uid != folder.uid) {
						event.stopPropagation();
						event.preventDefault();
						folder.dragHover = true;
					}
					folder.openFolder = true;
				} else if (this.draggingFolder) {
					event.stopPropagation();
					if (folder != this.draggingFolder) {
						event.preventDefault();
						var per = dragging.dragOverPercentage(event.currentTarget, event.clientY);
						if (per > 0.6 || folder.openFolder) {
							folder.sortLower = true;
							folder.sortUpper = false;
						} else if (per > 0.4) {
							folder.sortLower = true;
							folder.sortUpper = true;
							if (folder.folders.length > 0) folder.openFolder = true;
						} else {
							folder.sortLower = false;
							folder.sortUpper = true;
						}
					}
				} else {
					event.preventDefault();
				}
			},
			folderDragLeave(folder) {
				if (this.draggingNote) {
					folder.dragHover = false;
				} else if (this.draggingFolder) {
					folder.sortLower = false;
					folder.sortUpper = false;
				}
			},
			/**
			 * Handles dropping a note or a folder inside a folder.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    parent rack
			 * @param  {Object}  folder  current folder
			 */
			dropToFolder(event, rack, folder) {
				if (!this.isRack(rack)) rack = rack.rack;
				if (this.draggingNote && this.draggingNote.folder.uid != folder.uid) {
					console.log('Dropping Note to Folder');
					event.stopPropagation();
					// Dropping note to folder
					folder.dragHover = false;
					var note = this.draggingNote;
					arr.remove(note.folder.notes, (n) => {return n == note});
					note.folder = folder;
					note.rack = folder.rack;
					folder.notes.unshift(note);
					note.saveModel();
					this.$root.setDraggingNote(null);
					if (this.draggingNote == this.selectedNote) {
						this.changeFolder(folder);
					}
				} else if (this.draggingFolder && this.draggingFolder != folder) {
					console.log('Dropping Folder to Folder');
					event.stopPropagation();
					var draggingFolder = this.draggingFolder;
					var foldersFrom = arr.sortBy(draggingFolder.parent.folders.slice(), 'ordering', true);
					arr.remove(foldersFrom, (f) => { return f == draggingFolder });
					draggingFolder.parent.folders = foldersFrom;
					draggingFolder.rack = rack;
					var foldersTo;
					var findex;
					if (folder.sortUpper && folder.sortLower) {
						foldersTo = arr.sortBy(folder.folders.slice(), 'ordering', true);
						draggingFolder.parentFolder = folder;
						findex = 0;
					} else {
						foldersTo = arr.sortBy(folder.parent.folders.slice(), 'ordering', true);
						if (draggingFolder.parentFolder != folder.parentFolder) {
							draggingFolder.parentFolder = folder.parentFolder;
						}
						findex = foldersTo.indexOf(folder);
					}
					if (folder.sortUpper) {
						foldersTo.splice(findex, 0, draggingFolder);
					} else {
						foldersTo.splice(findex + 1, 0, draggingFolder);
					}

					foldersTo.forEach((f, i) => {
						f.ordering = i;
						f.saveModel();
					});

					if (folder.sortUpper && folder.sortLower) {
						folder.folders = foldersTo;
						folder.openFolder = true;
					} else {
						folder.parent.folders = foldersTo;
					}

					folder.sortUpper = false;
					folder.sortLower = false;
					this.$root.setDraggingFolder();
				}
			},
			folderMenu(bucket, folder) {
				if (!bucket.uid) return;
				var menu = new Menu();

				if (this.selectedFolder == folder) {
					menu.append(new MenuItem({
						label: 'Deselect folder',
						click: () => {
							this.changeFolder(null);
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
				} else {
					menu.append(new MenuItem({
						label: 'Select folder',
						click: () => {
							this.changeFolder(folder);
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
				}

				if (!bucket.trash_bin) {
					menu.append(new MenuItem({
						label: 'Rename folder',
						click: () => {
							this.$root.setEditingFolder(folder);
						}
					}));
					menu.append(new MenuItem({
						label: 'Add subfolder',
						click: () => {
							this.addFolder(folder);
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({
						label: 'Add note',
						click: () => {
							this.changeFolder(folder);
							this.$root.addNote();
						}
					}));
					menu.append(new MenuItem({
						label: 'Add encrypted note',
						click: () => {
							this.changeFolder(folder);
							this.$root.addEncryptedNote();
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
				}
				menu.append(new MenuItem({
					label: 'Delete folder',
					click: () => {
						if (confirm('Delete folder "' + folder.name + '" and its content?')) {
							this.changeBucket(bucket);
							this.$root.deleteFolder(folder);
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>