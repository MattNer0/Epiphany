import path from "path";
import fs from "fs";

import _ from "lodash";

import settings from "./utils/settings";

import traymenu from "./utils/trayMenu";
import titleMenu from "./utils/titleMenu";

import Vue from 'vue';

import VTooltip from 'v-tooltip'

import models from "./models";
import preview from "./preview";
import searcher from "./searcher";

// electron things
import { ipcRenderer, remote, clipboard, shell } from "electron";
const { Menu, MenuItem, dialog } = remote;

import arr from "./utils/arr";
import theme from "./utils/theme";
import elosenv from "./utils/elosenv";
import ittybitty from "./utils/itty-bitty";

// vue.js plugins
import component_outline from './components/outline.vue';
import component_codeMirror from './components/codemirror.vue';
import component_flashmessage from './components/flashmessage.vue';
import component_handlerNotes from './components/handlerNotes.vue';
import component_handlerStack from './components/handlerStack.vue';
import component_modal from './components/modal.vue';
import component_noteMenu from './components/noteMenu.vue';
import component_noteFooter from './components/noteFooter.vue';
import component_buckets from './components/buckets.vue';
import component_buckets_special from './components/bucketsSpecial.vue';
import component_notes from './components/notes.vue';
import component_addNote from './components/addNote.vue';
import component_titleBar from './components/titleBar.vue';
import component_tabsBar from './components/tabsBar.vue';
import component_searchBar from './components/searchBar.vue';
import component_themeEditor from './components/themeEditor.vue';
import component_themeMenu from './components/themeMenu.vue';

export default function() {

	settings.init();
	settings.loadWindowSize();

	Vue.use(VTooltip);

	// not to accept image dropping and so on.
	// electron will show local images without this.
	document.addEventListener('dragover', (e) => {
		e.preventDefault();
	});
	document.addEventListener('drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
	});

	var settings_baseLibraryPath = settings.get('baseLibraryPath');
	if (settings_baseLibraryPath) models.setBaseLibraryPath(settings_baseLibraryPath);

	var appVue = new Vue({
		el: '#app',
		template: require('../html/app.html'),
		data: {
			loadedEverything : false,
			loadedRack       : false,
			isFullScreen     : false,
			isPreview        : false,
			isToolbarEnabled : settings.getSmart('toolbarNote', true),
			isFullWidthNote  : settings.getSmart('fullWidthNote', true),
			keepHistory      : settings.getSmart('keepHistory', true),
			currentTheme     : settings.getJSON('theme', "dark"),
			showHidden       : false,
			useMonospace     : settings.getSmart('useMonospace', false),
			reduceToTray     : settings.getSmart('reduceToTray', true),
			preview          : "",
			racks            : [],
			trash_bucket     : null,
			quick_notes_bucket: null,
			notes            : [],
			images           : [],
			notesHistory     : [],
			selectedRack     : null,
			selectedFolder   : null,
			selectedNote     : null,
			timeoutNoteChange: false,
			editTheme        : null,
			showHistory      : false,
			showSearch       : false,
			showAll          : false,
			showFavorites    : false,
			noteTabs         : [],
			editingBucket    : null,
			editingFolder    : null,
			originalNameRack : "",
			draggingRack     : null,
			draggingFolder   : null,
			draggingNote     : null,
			search           : '',
			loadingUid       : '',
			allDragHover     : false,
			messages         : [],
			modalShow        : false,
			modalTitle       : 'title',
			modalDescription : 'description',
			modalPrompts     : [],
			modalOkcb        : null,
			racksWidth       : settings.getSmart('racksWidth', 220),
			notesWidth       : settings.getSmart('notesWidth', 220),
			fontsize         : settings.getSmart('fontsize', 15),
			notesDisplayOrder: 'updatedAt',
		},
		components: {
			'flashmessage'  : component_flashmessage,
			'buckets'       : component_buckets,
			'bucketsSpecial': component_buckets_special,
			'notes'         : component_notes,
			'modal'         : component_modal,
			'addNote'       : component_addNote,
			'titleBar'      : component_titleBar,
			'searchBar'     : component_searchBar,
			'noteMenu'      : component_noteMenu,
			'noteFooter'    : component_noteFooter,
			'handlerStack'  : component_handlerStack,
			'handlerNotes'  : component_handlerNotes,
			'codemirror'    : component_codeMirror,
			'outline'       : component_outline,
			'tabsBar'       : component_tabsBar,
			'themeEditor'   : component_themeEditor,
			'themeMenu'     : component_themeMenu
		},
		computed: {
			/**
			 * filters notes based on search terms
			 * @function filteredNotes
			 * @return  {Array}  notes array
			 */
			filteredNotes() {
				if (this.selectedFolder) {
					var notes = searcher.searchNotes(this.search, this.selectedFolder.notes);
					if (this.showSearch && notes.length == 0) this.changeFolder(null);
					return notes;
				} else if (this.selectedRack && this.showAll) {
					return searcher.searchNotes(this.search, this.selectedRack.allnotes);
				} else if (this.selectedRack && this.showFavorites) {
					return searcher.searchNotes(this.search, this.selectedRack.starrednotes);
				} else if (this.showHistory) {
					return this.notesHistory;
				} else {
					return [];
				}
			},
			searchRack() {
				if (this.search && this.racks.length > 0) {
					var meta_rack = {
						folders: []
					};

					this.racks.forEach((r) => {
						r.folders.forEach((f) => {
							if (f.searchnotes(this.search).length > 0) {
								meta_rack.folders.push(f);
							}
						});
					});

					return meta_rack;
				}

				return null;
			},
			isNoteSelected() {
				if (this.selectedNote instanceof models.Note) return true;
				return false;
			},
			isOutlineSelected() {
				if(this.selectedNote instanceof models.Outline) return true;
				return false;
			},
			isThemeSelected() {
				return this.editTheme !== null;
			},
			showNoteContainer() {
				return this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected;
			},
			showFolderNotesList() {
				return !this.draggingFolder && (this.selectedFolder || this.showAll || this.showFavorites);
			},
			mainCellClass() {
				var classes = [ 'font' + this.fontsize ];
				if (this.noteTabs.length > 1) classes.push('tabs-open');
				if (this.isFullWidthNote) classes.push('full-note');
				if (this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected) classes.push('note-open');
				if (!this.isToolbarEnabled) classes.push('notebar-disabled');
				return classes;
			},
			currentThemeAsString() {
				if (typeof this.currentTheme == "string") return this.currentTheme;
				return "custom";
			},
			libraryPath() {
				return models.getBaseLibraryPath();
			}
		},
		created() {
			this.$on('modal-show', (modalMessage) => {
				this.modalTitle = modalMessage.title;
				this.modalDescription = modalMessage.description;
				this.modalPrompts = modalMessage.prompts;
				this.modalOkcb = modalMessage.okcb;
				this.modalShow = true;
			});

			if (!models.getBaseLibraryPath()) {
				// hey, this is the first time.
				models.setLibraryToInitial();

				settings_baseLibraryPath = models.getBaseLibraryPath();
				settings.set('baseLibraryPath', settings_baseLibraryPath);
			}

			if (models.doesLibraryExists()) {
				// library folder exists, let's read what's inside
				ipcRenderer.send('load-racks', { library: models.getBaseLibraryPath() });

			} else {
				elosenv.console.error("Couldn't open library directory. Path: " + models.getBaseLibraryPath());
				setTimeout(() => {
					this.$refs.dialog.init('Error', 'Couldn\'t open library directory.\nPath: '+models.getBaseLibraryPath(), [{
						label: 'Ok',
						cancel: true
					}]);
					settings.set('baseLibraryPath', "");
				}, 100);
			}
		},
		mounted() {
			var self = this;

			theme.load(this.currentTheme);

			this.$nextTick(() => {
				window.addEventListener('resize', (e) => {
					e.preventDefault();
					self.update_editor_size();
				});
				window.addEventListener('keydown', (e) => {
					if (((e.keyCode == 86 && e.shiftKey && e.ctrlKey) || (e.keyCode == 80 && e.altKey)) && self.isPreview) {
						e.preventDefault();
						e.stopPropagation();
						self.togglePreview();
					}
				}, true);

				this.init_sidebar_width();
			});

			ipcRenderer.on('loaded-racks', (event, data) => {
				if (!data || !data.racks) return;

				var racks = [];
				data.racks.forEach((r) => {
					racks.push(new models.Rack(r));
				});

				this.racks = arr.sortBy(racks.slice(), 'ordering', true);

				this.racks.forEach((r, i) => {
					if (r.trash_bin) {
						self.trash_bucket = r;
					} else if (r.quick_notes) {
						self.quick_notes_bucket = r;
					}
				});

				this.loadedRack = true;
			});

			ipcRenderer.on('loaded-folders', (event, data) => {
				if (!data) return;

				data.forEach((r) => {
					var rack = this.findRackByPath(r.rack);
					var folders = [];
					r.folders.forEach((f) => {
						f.rack = rack;
						folders.push(new models.Folder(f));
					});

					rack.folders = arr.sortBy(folders.slice(), 'ordering', true);
				});
			});

			function loadByParent(obj, rack, parent) {
				var folder;
				if (parent) {
					folder = parent.folders.filter((f) => {
						return f.path == obj.folder;
					})[0];
				} else if (rack) {
					folder = rack.folders.filter((f) => {
						return f.path == obj.folder;
					})[0];
				}

				var notes = [];
				obj.notes.forEach((n) => {
					n.rack = rack;
					n.folder = folder;
					switch(n.type) {
						case 'encrypted':
							notes.push(new models.EncryptedNote(n));
							break;
						case 'outline':
							notes.push(new models.Outline(n));
							break;
						default:
							notes.push(new models.Note(n));
							break;
					}
				});

				var images = [];
				obj.images.forEach((img) => {
					img.rack = rack;
					img.folder = folder;
					images.push(new models.Image(img));
				});

				folder.notes = notes;
				folder.images = images;
				self.notes = notes.concat(self.notes);
				self.images = images.concat(self.images);

				if (obj.subnotes && obj.subnotes.length > 0) {
					obj.subnotes.forEach((r) => {	
						loadByParent(r, rack, folder);
					});
				}
			}

			ipcRenderer.on('loaded-notes', (event, data) => {
				if (!data) return;

				var rack;
				data.forEach((r) => {
					if (!rack || rack.path != r.rack) {
						rack = self.findRackByPath(r.rack);
					}
					loadByParent(r, rack);
				});
			});

			ipcRenderer.on('loaded-all-notes', (event, data) => {
				if (!data) return;

				elosenv.console.log("Loaded all notes in the library.");

				if (self.keepHistory && self.notes.length > 1) {
					self.notesHistory = arr.sortBy(self.notes.filter((obj) => {
						return !obj.isEncrypted && !obj.rack.trash_bin;
					}), 'updatedAt').slice(0,10);
				}

				var loading_note = false;

				traymenu.init();
				titleMenu.init();

				self.loadedEverything = true;

				if (self.notes.length == 1) {
					self.changeNote(self.notes[0]);
					loading_note = true;

				} else if (remote.getGlobal('argv')) {
					var argv = remote.getGlobal('argv');
					if (argv.length > 1 && path.extname(argv[1]) == '.md' && fs.existsSync(argv[1])) {
						var openedNote = self.findNoteByPath(argv[1]);
						if (openedNote) {
							this.changeNote(openedNote);
						} else {
							elosenv.console.error("Path not valid");
						}
						loading_note = true;
					}
				}
			});

			ipcRenderer.on('load-page-fail', (event, data) => {
				self.sendFlashMessage(5000, 'error', 'Load Failed');
				self.loadingUid = '';
			});

			ipcRenderer.on('load-page-finish', (event, data) => {
				self.loadingUid = '';
			});

			ipcRenderer.on('load-page-success', (event, data) => {
				switch (data.mode) {
					case 'note-from-url':
						if (data.markdown) {
							var new_note = self.addNote();
							if (data.url) {
								new_note.setMetadata("Web", data.url);
							}
							new_note.body = data.markdown;
							self.sendFlashMessage(1000, 'info', 'New Note From Url');
						} else {
							self.sendFlashMessage(5000, 'error', 'Conversion Failed');
						}
						break;
					default:
						break;
				}
			});

			ipcRenderer.on('download-files-failed', (event, data) => {
				if (!data.replaced || data.replaced.length == 0) return;
				var noteObj = self.findNoteByPath(data.note);
				if (noteObj) {
					for (var i=0; i<data.replaced.length; i++) {
						var subStr = data.replaced[i];
						noteObj.body = noteObj.body.replace(subStr.new, subStr.original);
					}
				}
				self.sendFlashMessage(5000, 'error', data.error);
			});

			ipcRenderer.on('bucket-rename', (event, data) => {
				if (data && data.bucket_uid && self.editingBucket && self.editingBucket.uid == data.bucket_uid) {
					if (data.name) {
						self.editingBucket.name = data.name;
						self.editingBucket.saveModel();
						if (self.selectedBucket != self.editingBucket) self.changeRack(self.editingBucket, true);
						self.editingBucket = null;
					} else if (self.editingBucket.name.length == 0) {
						if (self.editingBucket.folders.length > 0) {
							self.editingBucket.name = "New Bucket";
						} else {
							self.removeRack(self.editingBucket);
							self.editingBucket = null;
						}
					}
				}
			});

			ipcRenderer.on('focus', (event, data) => {
				if (data && data.focus) {
					document.getElementById('main-editor').classList.remove("blur");
				} else {
					document.getElementById('main-editor').classList.add("blur");
				}
			});
		},
		methods: {
			findNoteByPath(notePath) {
				if (!notePath) return undefined;
				return this.notes.find((note) => {
					return note.data.path == notePath;
				});
			},
			findRackByPath(rackPath) {
				try {
					return this.racks.filter((rk) => {
						return rk.path == rackPath;
					})[0];
				} catch(e) {
					elosenv.console.warn("Couldn't find rack by path \""+rackPath+"\"");
					return null;
				}
			},
			findFolderByPath(rack, folderPath) {
				try {
					var folder = rack.folders.filter((f) => {
						return f.path == folderPath;
					})[0];
					if (folder) return folder;
					var rp = path.relative(rack.path, folderPath);
					rp = rp.split(path.sep);
					var parent = rack;
					for (var i = 0; i < rp.length; i++) {
						parent = parent.folders.filter((f) => {
							return f.path == path.join(parent.path, rp[i]);
						})[0];
					}
					return parent;
				} catch(e) {
					elosenv.console.warn("Couldn't find folder by path \""+folderPath+"\"");
					return null;
				}
			},
			/**
			 * initialize the width of the left sidebar elements.
			 * @function init_sidebar_width
			 * @return {Void} Function doesn't return anything
			 */
			init_sidebar_width() {
				this.racksWidth = Math.min(this.racksWidth, this.notesWidth);
				this.notesWidth = this.racksWidth;

				var handlerStack = document.getElementById('handlerStack');
				if (handlerStack) {
					handlerStack.previousElementSibling.style.width = this.racksWidth + 'px';
					this.$refs.refHandleStack.checkWidth(this.racksWidth);
				}

				var handlerNotes = document.getElementById('handlerNotes');
				if (handlerNotes) {
					handlerNotes.previousElementSibling.style.width = this.notesWidth + 'px';
					this.$refs.refHandleNote.checkWidth(this.notesWidth);
				}

				this.$nextTick(() => {
					this.update_editor_size();
				});
			},
			/**
			 * scrolls to the top of the notes sidebar.
			 * 
			 * @function scrollUpScrollbarNotes
			 * @return {Void} Function doesn't return anything
			 */
			scrollUpScrollbarNotes() {
				this.$nextTick(() => {
					if (this.$refs.refNotes) this.$refs.refNotes.scrollTop = 0;
				});
			},
			/**
			 * scrolls to the top of the selected note.
			 * @function scrollUpScrollbarNote
			 * @return {Void} Function doesn't return anything
			 */
			scrollUpScrollbarNote() {
				this.$nextTick(() => {
					this.$refs.myEditor.scrollTop = 0;
				});
			},
			openHistory() {
				this.changeRack(null);
				this.showSearch = false;
				this.showHistory = !this.showHistory;
			},
			openSearch() {
				this.changeRack(null);
				this.showHistory = false;
				this.showSearch = !this.showSearch;

				this.$nextTick(() => {
					var searchInput = document.getElementById('search-bar');
					searchInput.focus();
				});
			},
			closeOthers() {
				this.changeRack(null);
				this.showSearch = false;
				this.showHistory = false;
			},
			changeRack(rack, from_sidebar) {
				var should_update_size = false;
				var same_rack = false;

				if (this.selectedRack === null && rack) should_update_size = true;
				else if (this.selectedFolder !== null && rack) should_update_size = true;

				if (this.selectedRack == rack && rack !== null) {
					same_rack = true;
					should_update_size = true;
				}

				if (rack !== null && this.quick_notes_bucket == rack) {
					var newNoteFolder = this.quick_notes_bucket.folders.filter((obj) => {
						return obj.name == "New Notes";
					});
					this.selectedRack = rack;
					this.showHistory = false;
					this.showSearch = false;
					this.changeFolder(newNoteFolder[0]);

				} else if (this.selectedNote && this.selectedNote.rack == rack) {
					if (from_sidebar && rack instanceof models.Rack) {
						this.selectedRack = rack;

						this.showHistory = false;
						this.showSearch = false;
					}
					this.changeFolder(this.selectedNote.folder);
				} else if (rack === null || rack instanceof models.Rack) {
					this.selectedRack = rack;
					this.editingFolder = null;
					this.originalNameRack = "";

					this.showHistory = false;
					this.showSearch = false;

					if (!same_rack) {
						this.selectedFolder = null;
						this.showAll = false;
						this.showFavorites = false;
					}
				} else {
					this.changeFolder(rack);
				}

				if (should_update_size) {
					this.update_editor_size();
				}
			},
			changeFolder(folder, weak) {
				if (weak && folder && (this.showAll || this.showFavorites) && this.selectedRack == folder.rack) return;
				if ((this.selectedFolder === null && folder) || (this.selectedFolder && folder === null)) this.update_editor_size();
				this.editingFolder = null;
				this.originalNameRack = "";

				if (folder && !this.showSearch && !this.showHistory) this.selectedRack = folder.rack;
				this.selectedFolder = folder;
				this.showAll = false;
				this.showFavorites = false;
			},
			showAllRack(rack) {
				//this.changeRack(rack);

				this.selectedFolder = null;
				this.editingFolder = null;
				this.originalNameRack = "";
				this.showHistory = false;
				this.showSearch = false;
				this.showAll = true;
				this.showFavorites = false;

				this.update_editor_size();
			},
			showFavoritesRack(rack) {
				//this.changeRack(rack);

				this.selectedFolder = null;
				this.editingFolder = null;
				this.originalNameRack = "";
				this.showHistory = false;
				this.showSearch = false;
				this.showAll = false;
				this.showFavorites = true;

				this.update_editor_size();
			},
			/**
			 * event called when a note is selected.
			 * @param  {Object}  note  selected note
			 * @return {Void} Function doesn't return anything
			 */
			changeNote(note, newtab, from_sidebar) {
				var self = this;

				if (this.isNoteSelected && this.selectedNote && this.selectedNote != note) {
					this.selectedNote.saveModel();
				}

				if (note !== null && from_sidebar && this.draggingNote) {
					this.draggingNote = false;
				}

				this.editTheme = null;

				this.timeoutNoteChange = true
				setTimeout(() => {
					this.timeoutNoteChange = false
				}, 200)

				if (note === null) {
					this.selectedNote = null;
					return;
				} else if (note == this.selectedNote) {
					if (this.selectedRack === null && !this.showSearch) this.changeFolder(note.folder);
					else if (!this.isFullScreen && from_sidebar) {
						this.setFullScreen(true);
					}
					return;
				}

				if (note.folder && note.folder instanceof models.Folder) {
					note.folder.parent.openFolder = true;
					if (this.selectedFolder != note.folder) {
						this.changeFolder(note.folder, true);
					}
				}

				if (this.noteTabs.length > 1) {
					newtab = true;
				}

				if (this.noteTabs.length == 0) {
					this.noteTabs.push(note);
				} else if (this.noteTabs.indexOf(note) == -1) {
					if (newtab) {
						this.noteTabs.push(note);
					}

					if (!newtab && this.selectedNote) {
						var ci = this.noteTabs.indexOf(this.selectedNote);
						this.noteTabs.splice(ci, 1, note);
					}
				}

				if (note instanceof models.Outline) {
					this.selectedNote = note;
				} else {
					if (!note.body) {
						if (note.loadBody()) {
							ipcRenderer.send('cache-note', note.getObjectDB(models.getBaseLibraryPath()));
						}
					}
					if (note.isEncrypted) {
						var message = 'Insert the secret key to Encrypt and Decrypt this note';
						this.$refs.dialog.init('Secret Key', message, [{
							label: 'Ok',
							cb(data) {
								var result = note.decrypt(data.secretkey);
								if(result.error) {
									setTimeout(() => {
										self.$refs.dialog.init('Error', result.error + '\nNote: ' + note.path, [{
											label: 'Ok',
											cancel: true
										}]);
									}, 100);
								} else {
									self.selectedNote = note;
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
						}]);
					} else {
						this.selectedNote = note;
					}
				}
			},
			/**
			 * event called when a note is dragged.
			 * 
			 * @function setDraggingNote
			 * @param  {Object}  note  Note being dragged
			 * @return {Void} Function doesn't return anything
			 */
			setDraggingNote(note) {
				this.draggingNote = note;
			},
			/**
			 * adds a new rack to the working directory.
			 * The new rack is placed on top of the list.
			 * 
			 * @function addRack
			 * @param  {Object}  rack    The new rack
			 * @return {Void} Function doesn't return anything
			 */
			addRack(rack) {
				var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
				racks.unshift(rack);
				racks.forEach((r, i) => {
					r.ordering = i;
					r.saveModel();
				});
				this.racks = racks;
			},
			/**
			 * @description removes the Rack (and its contents) from the current working directory.
			 * @param  {Object}  rack    The rack
			 * @return {Void} Function doesn't return anything
			 */
			removeRack(rack) {
				var should_update_size = false;
				if (this.selectedRack === rack) {
					this.selectedRack = null;
					should_update_size = true;
				}
				if (this.selectedFolder && this.selectedFolder.rack === rack) {
					this.selectedFolder = null;
					should_update_size = true;
				}
				if (this.quick_notes_bucket === rack) {
					this.quick_notes_bucket = null;
					should_update_size = true;
				}

				rack.remove(this.notes);
				arr.remove(this.racks, (r) => {
					return r == rack;
				});
				// we need to close the current selected note if it was from the removed rack.
				if (this.isNoteSelected && this.selectedNote.rack == rack) {
					this.selectedNote = null;
				}
				if (should_update_size) {
					this.update_editor_size();
				}
			},
			setEditingRack(bucket) {
				if (bucket) {

					this.editingBucket = bucket;

					ipcRenderer.send('open-popup', {
						type: "input-text",
						theme: this.currentTheme,
						title: "Rename Bucket",
						form: "bucket-name",
						bucket: bucket.name,
						bucket_uid: bucket.uid,
						height: "small",
						width: "small"
					});
				} else {
					this.editingBucket = null;
				}
			},
			setEditingFolder(folder) {
				if (folder) {
					this.editingFolder = folder.uid;
				} else {
					this.editingFolder = null;
				}
			},
			setDraggingRack(rack) {
				if (rack) {
					this.draggingRack = rack;
				} else {
					this.draggingRack = null;
				}
			},
			setDraggingFolder(folder) {
				if (folder) {
					this.draggingFolder = folder;
				} else {
					this.draggingFolder = null;
				}
			},
			/**
			 * inserts a new Folder inside the selected Rack.
			 * The new Folder is placed on top of the list.
			 * 
			 * @function addFolderToRack
			 * @param  {Object}  rack    The rack
			 * @param  {Object}  folder  The folder
			 * @return {Void} Function doesn't return anything
			 */
			addFolderToRack(rack, folder) {
				var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
				folders.unshift(folder);
				folders.forEach((f, i) => {
					f.ordering = i;
					f.saveModel();
				});
				rack.folders = folders;
			},
			/**
			 * deletes a folder and its contents from the parent rack.
			 * @function deleteFolder
			 * @param  {Object}  folder  The folder
			 * @return {Void} Function doesn't return anything
			 */
			deleteFolder(folder) {
				if (this.selectedFolder === folder) this.selectedFolder = null;
				arr.remove(folder.parent.folders, (f) => {
					return f == folder;
				});
				folder.remove(this.notes);
				// we need to close the current selected note if it was from the removed folder.
				if(this.isNoteSelected && this.selectedNote.folder == folder) {
					this.selectedNote = null;
				}
			},
			deleteNote(note) {
				if (note.folder && note.folder.notes.length > 0) {
					var i1 = note.folder.notes.indexOf(note);
					note.folder.notes.splice(i1, 1);
				}
				var i2 = this.notes.indexOf(note);
				if (i2 >= 0) this.notes.splice(i2, 1);

				if (this.selectedNote == note) {
					this.selectedNote = null;
				}

				if (note.remove()) {

					if (!this.trash_bucket) {
						this.trash_bucket = new models.Rack({
							name: ".coon_trash",
							path: path.join(
								settings_baseLibraryPath,
								".coon_trash"
							),
							hidden: true,
							trash_bin: true,
							ordering: this.racks.length+1
						});
						this.addRack(this.trash_bucket, true);
					}

					var new_folder = this.trash_bucket.hasFolder(note.folder.name);
					if (!new_folder) {
						// create folder
						new_folder = new models.Folder({
							name        : note.folder.name,
							rack        : this.trash_bucket,
							parentFolder: undefined,
							ordering    : 0
						});
						this.addFolderToRack(this.trash_bucket, new_folder);
					}

					note.rack = this.trash_bucket;
					note.folder = new_folder;
					new_folder.notes.unshift(note);
					note.title = note.title+"_"+note.updatedAt.format('YYYY-MM-DD HH:mm:ss');
					note.saveModel();
				}
			},
			newQuickNote() {
				var self = this;

				function newFolder() {
					var folder = new models.Folder({
						name        : 'New Notes',
						rack        : self.quick_notes_bucket,
						parentFolder: undefined,
						rackUid     : self.quick_notes_bucket.uid,
						ordering    : 0
					});
					self.addFolderToRack(self.quick_notes_bucket, folder);
					self.changeFolder(folder);
				}

				this.showHistory = false;
				this.showSearch = false;

				if (!this.quick_notes_bucket) {
					this.quick_notes_bucket = new models.Rack({
						name: "_quick_notes",
						path: path.join(
							settings_baseLibraryPath,
							"_quick_notes"
						),
						quick_notes: true,
						ordering: 0
					});
					this.addRack(this.quick_notes_bucket);
					newFolder();

				} else if (this.quick_notes_bucket.folders.length == 0) {
					newFolder();
				} else {
					var right_folder = null;
					for (var i=0; i<this.quick_notes_bucket.folders.length; i++) {
						if (this.quick_notes_bucket.folders[i].name == 'New Notes') {
							right_folder = this.quick_notes_bucket.folders[i];
							break;
						}
					}

					if (right_folder === null) {
						newFolder();
					} else {
						this.changeFolder(right_folder);
					}
				}

				this.addNote();

				this.$nextTick(() => {
					if (self.isFullScreen) {
						self.toggleFullScreen();
					}
				});
			},
			/**
			 * event called after folder was dragged into a rack.
			 * @param  {Object}  rack    The rack
			 * @param  {Object}  folder  The folder
			 * @return {Void} Function doesn't return anything
			 */
			folderDragEnded(rack) {
				if (!rack) return;
				rack.folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
			},
			/**
			 * toggles left sidebar.
			 * 
			 * @return {Void} Function doesn't return anything
			 */
			toggleFullScreen() {
				this.setFullScreen(!this.isFullScreen);
			},
			setFullScreen(value) {
				this.isFullScreen = value;
				settings.set('vue_isFullScreen', this.isFullScreen);
				this.update_editor_size();
			},
			toggleToolbar() {
				this.isToolbarEnabled = !this.isToolbarEnabled;
				settings.set('toolbarNote', this.isToolbarEnabled);
			},
			toggleFullWidth() {
				this.isFullWidthNote = !this.isFullWidthNote;
				settings.set('fullWidthNote', this.isFullWidthNote);
			},
			/**
			 * @description toggles markdown note preview.
			 * @return {Void} Function doesn't return anything
			 */
			togglePreview() {
				this.isPreview = !this.isPreview;
				this.updatePreview();
			},
			calcSaveUid() {
				if (this.selectedRack) {
					var f = this.selectedRack.folders;
					if (!f || f.length == 0) {
						return null;
					}
					return f[0].uid;
				} else if (this.selectedFolder) {
					return this.selectedFolder.uid;
				}
				return null;
			},
			/**
			 * finds the currently selected folder.
			 * if a rack object is selected instead of a folder object,
			 * then it will get the first folder inside the rack.
			 * 
			 * @return  {Object}  Folder object if one is selected, 'null' otherwise
			 */
			getCurrentFolder() {
				if (this.selectedFolder) {
					return this.selectedFolder;
				} else if (this.selectedRack) {
					var f = this.selectedRack.folders;
					if (!f || f.length == 0) {
						return null;
					}
					return f[0];
				}
				return null;
			},
			/**
			 * add new note to the current selected Folder
			 * 
			 * @return  {Note}  New Note object
			 */
			addNote() {
				var currFolder = this.getCurrentFolder();
				this.changeNote(null);
				this.changeFolder(currFolder);
				var newNote = models.Note.newEmptyNote(currFolder);
				if (newNote) {
					if (this.search.length > 0) this.search = '';
					currFolder.notes.unshift(newNote);
					this.notes.unshift(newNote);
					this.isPreview = false;
					this.changeNote(newNote);
				} else {
					this.sendFlashMessage(5000, 'error', 'You must select a Folder!');
				}
				return newNote;
			},
			addOutline() {
				var currFolder = this.getCurrentFolder();
				this.changeNote(null);
				this.changeFolder(currFolder);
				var newOutline = models.Outline.newEmptyOutline(currFolder);
				if (newOutline) {
					if (this.search.length > 0) this.search = '';
					currFolder.notes.unshift(newOutline);
					this.notes.unshift(newOutline);
					this.isPreview = false;
					this.changeNote(newOutline);
				} else {
					this.sendFlashMessage(5000, 'error', 'You must select a Folder!');
				}
				return newOutline;
			},
			/**
			 * add new encrypted note to the current selected Folder
			 * 
			 * @return {Void} Function doesn't return anything
			 */
			addEncryptedNote() {
				var currFolder = this.getCurrentFolder();
				this.changeNote(null);
				this.changeFolder(currFolder);
				var newNote = models.EncryptedNote.newEmptyNote(currFolder);
				if (newNote) {
					if (this.search.length > 0) this.search = '';
					currFolder.notes.unshift(newNote);
					this.notes.unshift(newNote);
					this.isPreview = false;
					this.changeNote(newNote);
					newNote.saveModel();
				} else {
					this.sendFlashMessage(5000, 'error', 'You must select a Folder!');
				}
			},
			/*addNotes(noteTexts) {
				var uid = this.calcSaveUid();
				var newNotes = noteTexts.map((noteText) => {
					return new models.Note({
						body: noteText,
						folderUid: uid
					});
				});
				newNotes.forEach((note) => {
					note.saveModel();
				});
				this.notes = newNotes.concat(this.notes);
			},*/
			/**
			 * @description save current selected Note.
			 * @return {Void} Function doesn't return anything
			 */
			saveNote: _.debounce(function () {
				var result;
				if (this.selectedNote) {
					result = this.selectedNote.saveModel();
				}
				if (result && result.error && result.path) {
					this.sendFlashMessage(5000, 'error', result.error);
				} else if(result && result.saved) {
					this.sendFlashMessage(1000, 'info', 'Note saved');
					if (this.selectedNote && this.notesDisplayOrder == 'updatedAt' && !this.showHistory) {
						this.scrollUpScrollbarNotes();
					}
				}
			}, 500),
			addNoteFromUrl() {
				ipcRenderer.send('open-popup', {
					type: "input-text",
					theme: this.currentTheme,
					title: "New Note From URL",
					form: "note-url",
					height: "small"
				});
			},
			/**
			 * @description displays an image with the popup dialog
			 * @param  {String}  url  The image url
			 * @return {Void} Function doesn't return anything
			 */
			openImg(url) {
				this.$refs.dialog.image(url);
			},
			contextOnPreviewLink(e, href) {
				if (e.stopPropagation) {
					e.stopPropagation();
				}
			
				var m = new Menu();
				m.append(new MenuItem({
					label: 'Copy Link',
					click: function() {
						clipboard.writeText(href);
					}
				}));
				m.append(new MenuItem({
					label: 'Open Link In Browser',
					click: () => {
						shell.openExternal(href)
					}
				}));
				m.popup(remote.getCurrentWindow());
			},
			contextOnInternalLink(e, href) {
				var self = this;
				if (e.stopPropagation) {
					e.stopPropagation();
				}
			
				var m = new Menu();
				m.append(new MenuItem({
					label: 'Copy Link',
					click: function() {
						clipboard.writeText(href);
					}
				}));
				m.append(new MenuItem({
					label: 'Open in new tab',
					click: function() {
						self.openInternalLink(null, href, true);
					}
				}));
				m.popup(remote.getCurrentWindow());
			},
			openInternalLink(e, href, new_tab) {
				if (e && e.stopPropagation) {
					e.stopPropagation();
				}
				
				href = href.replace("coon://library/", "");
				href = decodeURIComponent(href);
				href = path.join(settings_baseLibraryPath, href);
			
				var noteObj = this.findNoteByPath(href);
				if (noteObj) {
					this.changeNote(noteObj, new_tab);
				}
			},
			open_share_url() {
				if (this.preview) {
					var css_html = "<style>#share{margin: 2em auto;width: 100%;max-width: 1200px;}ul.task-list{list-style: none;padding-left: 0;}</style>"
					var preview_html = "<div id=\"share\">" + css_html + this.preview + "</div>";
					ittybitty.get_uri(preview_html, this.selectedNote.title, function(url) {
						shell.openExternal(url);
					});
				}
			},
			/**
			 * displays context menu for the list of racks.
			 * @function backetsMenu
			 * @return {Void} Function doesn't return anything
			 */
			bucketsMenu() {
				var menu = new Menu();
				menu.append(new MenuItem({
					label: 'Add Bucket',
					click: () => {
						var backet = new models.Rack({
							name: "",
							ordering: 0
						});
						this.addRack(backet);
						this.setEditingRack(backet);
					}
				}));
				menu.popup(remote.getCurrentWindow());
			},
			foldersMenu() {
				if (this.selectedRack === null) return;

				var menu = new Menu();
				menu.append(new MenuItem({
					label: 'Add Folder',
					click: () => {
						var folder = new models.Folder({
							name        : '',
							rack        : this.selectedRack,
							parentFolder: undefined,
							rackUid     : this.selectedRack.uid,
							ordering    : 0
						});
						this.addFolderToRack(this.selectedRack, folder);
						this.setEditingFolder(folder);
					}
				}));
				menu.popup(remote.getCurrentWindow());
			},
			/**
			 * displays context menu on the selected note in preview mode.
			 * @function previewMenu
			 * @return {Void} Function doesn't return anything
			 */
			previewMenu() {
				var self = this;
				var menu = new Menu();

				menu.append(new MenuItem({
					label: 'Copy',
					accelerator: 'CmdOrCtrl+C',
					click() { document.execCommand('copy'); }
				}));
				menu.append(new MenuItem({ type: 'separator' }));
				menu.append(new MenuItem({
					label: 'Copy to clipboard (Markdown)',
					click() {
						if(self.selectedNote) clipboard.writeText(self.selectedNote.bodyWithDataURL);
					}
				}));
				menu.append(new MenuItem({
					label: 'Copy to clipboard (HTML)',
					click() {
						if(self.preview) clipboard.writeText(self.preview);
					}
				}));
				menu.append(new MenuItem({ type: 'separator' }));
				menu.append(new MenuItem({
					label: 'Toggle Preview',
					click() { self.togglePreview(); }
				}));
				menu.popup(remote.getCurrentWindow());
			},
			loadThemeFromFile() {
				var themePath = dialog.showOpenDialog(remote.getCurrentWindow(), {
					title: 'Import Theme',
					filters: [{
						name: 'Theme',
						extensions: ['json']
					}],
					properties: ['openFile']
				});
				if (!themePath || themePath.length == 0) {
					return;
				}

				try {
					this.setCustomTheme(
						JSON.parse(fs.readFileSync(themePath[0], 'utf8'))
					);
				} catch(e) {
					console.error(e);
				}
			},
			setCustomTheme(themeJson) {
				if (typeof themeJson == "string") {
					if (this.currentTheme == themeJson) return;
					this.currentTheme = themeJson;
					theme.load(this.currentTheme);
					settings.set('theme', this.currentTheme);

				} else {
					var themeKeys = theme.keys();
					var intersectionKeys = _.intersection(themeKeys, Object.keys(themeJson));
					if (intersectionKeys.length == themeKeys.length) {
						this.currentTheme = themeJson;
						theme.load(this.currentTheme);
						settings.set('theme', this.currentTheme);

					} else {
						console.error("wrong keys");
					}
				}
			},
			editThemeView() {
				var themeJson;
				if (typeof this.currentTheme == "string") {
					themeJson = theme.read_file(this.currentTheme);
				} else {
					themeJson = this.currentTheme;
				}

				this.changeNote(null);
				this.editTheme = themeJson;

				this.toggleFullScreen();
			},
			/*importNotes() {
				var notePaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
					title: 'Import Note',
					filters: [{
						name: 'Markdown',
						extensions: ['md', 'markdown', 'txt']
					}],
					properties: ['openFile', 'multiSelections']
				});
				if (!notePaths || notePaths.length == 0) {
					return;
				}
				var noteBodies = notePaths.map((notePath) => {
					return fs.readFileSync(notePath, 'utf8');
				});
				this.addNotes(noteBodies);
			},*/
			moveSync() {
				var currentPath = models.getBaseLibraryPath();
				var newPaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
					title: 'Select New Sync Folder',
					defaultPath: currentPath || '/',
					properties: ['openDirectory', 'createDirectory', 'promptToCreate']
				});
				if (!newPaths) {
					return;
				}
				var newPath = newPaths[0];

				// copy files
				if (models.copyData(currentPath, newPath)) {
					models.setBaseLibraryPath(newPath);
					settings.set('baseLibraryPath', newPath);
					remote.getCurrentWindow().reload();
				} else {
					this.sendFlashMessage(5000, 'error', 'Directory is not Valid');
				}
			},
			openSync() {
				var currentPath = models.getBaseLibraryPath();
				var newPaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
					title: 'Open Existing Sync Folder',
					defaultPath: currentPath || '/',
					properties: ['openDirectory', 'createDirectory']
				});
				if (!newPaths) {
					return;
				}
				var newPath = newPaths[0];

				models.setBaseLibraryPath(newPath);
				settings.set('baseLibraryPath', newPath);
				remote.getCurrentWindow().reload();
			},
			/**
			 * shows the About dialog window.
			 * @function openAbout
			 * @return {Void} Function doesn't return anything
			 */
			openAbout() {
				ipcRenderer.send('open-popup', {
					type: "about",
					theme: this.currentTheme,
					library: models.getBaseLibraryPath(),
					title: "About",
					height: "medium"
				});
			},
			/**
			 * change how notes are sorted in the sidebar
			 * @function changeDisplayOrder
			 * @param  {String}  value   The sort by field
			 * @return {Void} Function doesn't return anything
			 */
			changeDisplayOrder(value) {
				var allowedOrders = ['updatedAt', 'createdAt', 'title'];
				if(allowedOrders.indexOf(value) >= 0) {
					this.notesDisplayOrder = value;
				}
			},
			/**
			 * sends a Flash Message.
			 * @function sendFlashMessage
			 * @param    {Integer}    period   How long it will last (in ms)
			 * @param    {String}     level    Flash level (info,error)
			 * @param    {String}     text     Flash message text
			 * @param    {String}     url      Url to open when Flash Message is clicked
			 * @return {Void} Function doesn't return anything
			 */
			sendFlashMessage(period, level, text, url) {
				var message = {
					level: 'flashmessage-' + level,
					text: text,
					period: period,
					url: url
				};
				this.messages.push(message);
				setTimeout(() => {
					this.messages.shift();
				}, message.period);
			},
			/**
			 * saves the sidebar width (both racks and notes lists).
			 * @function save_editor_size
			 * @return {Void} Function doesn't return anything
			 */
			save_editor_size() {
				this.racksWidth = parseInt(this.$refs.sidebarFolders.style.width.replace('px','')) || 180;
				settings.set('racksWidth', this.racksWidth);
				this.notesWidth = parseInt(this.$refs.sidebarNotes.style.width.replace('px','')) || 180;
				settings.set('notesWidth', this.notesWidth);
			},
			sidebarDrag() {
				this.update_editor_size();
			},
			sidebarDragEnd() {
				this.update_editor_size();
				this.save_editor_size();
			},
			updatePreview(no_scroll) {
				if (this.isPreview && this.selectedNote) {
					this.preview = preview.render(this.selectedNote, this);
					if (no_scroll === undefined) this.scrollUpScrollbarNote();
				} else {
					this.preview = '';
				}
			},
			closingWindow(quit) {
				settings.saveWindowSize();
				if (quit) {
					remote.app.quit();
				} else {
					var win = remote.getCurrentWindow();
					win.hide();
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
				var widthTotalLeft = 0;
				var widthFixedLeft = 0;

				var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar > div');
				var cellsFixedLeft = document.querySelectorAll('.outer_wrapper .fixed-sidebar > div');

				for (var i = 0; i < cellsLeft.length; i++) {
					widthTotalLeft += cellsLeft[i].offsetWidth;
				}

				for (var i = 0; i < cellsFixedLeft.length; i++) {
					widthFixedLeft += cellsFixedLeft[i].offsetWidth;
				}

				if (this.isFullScreen) {
					document.querySelector('.sidebar').style.left = '-' + widthTotalLeft + 'px';
					widthTotalLeft = widthFixedLeft;
				} else {
					document.querySelector('.sidebar').style.left = '';
					widthTotalLeft += widthFixedLeft;
				}

				document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft + 'px';
			}, 100)
		},
		watch: {
			fontsize() {
				settings.set('fontsize', this.fontsize);
				if (this.selectedNote) {
					this.$nextTick(() => {
						this.$refs.refCodeMirror.refreshCM();
					});
				}
			},
			showHidden() {
				if (!this.showHidden && this.selectedRack !== null && this.selectedRack.hidden) {
					this.changeRack(null);
				}
			},
			keepHistory() {
				settings.set('keepHistory', this.keepHistory);
			},
			useMonospace() {
				settings.set('useMonospace', this.useMonospace);
			},
			reduceToTray() {
				settings.set('reduceToTray', this.reduceToTray);
			},
			selectedNote() {
				if (this.selectedNote instanceof models.Note) {
					this.updatePreview();
				}
			},
			'selectedNote.body': function(newBody, oldBody) {
				if (this.selectedNote instanceof models.Outline) return;
				if (oldBody && !this.timeoutNoteChange) {
					this.saveNote();
				}
			},
			selectedRack() {
				this.scrollUpScrollbarNotes();
			},
			selectedFolder() {
				this.scrollUpScrollbarNotes();
			}
		}
	});
	global.appVue = appVue;
}