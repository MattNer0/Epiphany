<template lang="pug">
	.my-shelf-buckets(:class="{ 'draggingRack' : draggingBucket, 'draggingFolder' : draggingFolder }")
		.my-shelf-rack(v-for="bucket in bucketsWithFolders"
			:class="classBucket(bucket)"
			:draggable="editingFolder === null && !bucket.trash_bin ? 'true' : 'false'"
			v-tooltip="{ 'content': bucket.name, 'placement': 'left', 'boundariesElement': 'body' }"
			v-show="bucket.allnotes.length > 0 || !bucket.quick_notes"
			@dragstart.stop="rackDragStart($event, bucket)"
			@dragend.stop="rackDragEnd()"
			@dragover="rackDragOver($event, bucket)"
			@dragleave.stop="rackDragLeave(bucket)"
			@drop.stop="dropToRack($event, bucket)"
			@contextmenu.prevent.stop="bucketMenu(bucket)")
			.rack-object(
				:class="{ 'dragging' : draggingBucket == bucket }",
				@click="selectBucket(bucket)")
				a(v-if="bucket.icon")
					i.rack-icon(:class="'coon-'+bucket.icon")
				a(v-else)
					| {{ bucket.shorten }}
		
		.my-shelf-rack(v-tooltip="{ 'content': 'New bucket', 'placement': 'left', 'boundariesElement': 'body' }")
			.rack-object.bucket-special(@click="newBucket()")
				span
					i.rack-icon.coon-plus
</template>

<script>
	import { remote } from "electron";
	const { Menu, MenuItem, dialog } = remote;
	import fs from "fs";
	import path from "path";
	import Vue from "vue";
	import arr from "../utils/arr";
	import dragging from "../utils/dragging";
	import filehelper from "../utils/file";
	import Datauri from "datauri";
	import models from "../models";

	export default {
		name: 'buckets',
		props: {
			'buckets'             : Array,
			'selectedBucket'      : Object,
			'selectedFolder'      : Object,
			'draggingBucket'      : Object,
			'draggingFolder'      : Object,
			'draggingNote'        : Object,
			'isFullScreen'        : Boolean,
			'changeBucket'        : Function,
			'editingFolder'       : String,
			'originalNameBucket'  : String,
			'search'              : String,
			'showHidden'          : Boolean
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
			bucketsWithFolders() {
				return this.buckets.sort(function(a, b) { return a.ordering - b.ordering });
			}
		},
		methods: {
			classBucket(bucket) {
				if (bucket) {
					return {
						'isShelfSelected': (this.selectedBucket == bucket && !this.isDraggingNote && !this.isFullScreen) || bucket.dragHover,
						'hiddenBucket'   : bucket.hidden && !this.showHidden,
						'sortUpper'      : bucket.sortUpper,
						'sortLower'      : bucket.sortLower
					};
				}
			},
			/*doneRackEdit(bucket, undo) {
				if (!this.editingBucket) { return }
				if (bucket.name.length == 0) {
					if (this.originalNameBucket && this.originalNameBucket.length > 0) {
						bucket.name = this.originalNameBucket;
					} else if (bucket.folders.length > 0) {
						bucket.name = "new bucket";
					} else {
						this.$root.removeRack(bucket);
						this.$root.setEditingRack(null);
						return;
					}
				} else if (undo) {
					if (this.originalNameBucket && this.originalNameBucket.length > 0) {
						bucket.name = this.originalNameBucket;
					}
				}
				bucket.saveModel();
				this.$root.setEditingRack(null);
				if (this.selectedBucket != bucket) this.changeBucket(bucket);
			},*/
			// Dragging
			rackDragStart(event, bucket) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.$root.setDraggingRack(bucket);
			},
			rackDragEnd() {
				this.$root.setDraggingRack();
				this.changeBucket(null);
			},
			rackDragOver(event, bucket) {
				event.preventDefault();
				if (this.draggingFolder) {
					bucket.dragHover = true;
				} else if (this.draggingBucket && this.draggingBucket != bucket) {
					var per = dragging.dragOverPercentage(event.currentTarget, event.clientY);
					if (per > 0.5) {
						bucket.sortLower = true;
						bucket.sortUpper = false;
					} else {
						bucket.sortLower = false;
						bucket.sortUpper = true;
					}
				} else if (this.draggingNote) {
					if (this.selectedBucket != bucket) this.selectBucket(bucket);
				}
			},
			rackDragLeave(bucket) {
				bucket.dragHover = false;
				bucket.sortUpper = false;
				bucket.sortLower = false;
			},
			addFolder(rack) {
				if (!rack) return;
				var folder;
				folder = new models.Folder({
					name        : '',
					rack        : rack,
					parentFolder: undefined,
					rackUid     : rack.uid,
					ordering    : 0
				});
				this.$root.addFolderToRack(rack, folder);
				this.$root.setEditingFolder(folder);
			},
			/**
			 * Handles dropping a rack or a folder inside a rack.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    current rack
			 */
			dropToRack(event, rack) {
				if (this.draggingFolder) {
					console.log('Dropping to rack');
					var draggingFolder = this.draggingFolder;
					// Drop Folder to Rack
					
					var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
					if (draggingFolder.data.rack != rack) {
						arr.remove(draggingFolder.data.rack.folders, (f) => {return f == draggingFolder});
						draggingFolder.rack = rack;
					}
					draggingFolder.ordering = 0;
					folders.unshift(draggingFolder);
					folders.forEach((f) => {
						f.ordering += 1;
						f.saveModel();
					});
					rack.folders = folders;
					rack.dragHover = false;
					this.$root.setDraggingFolder();
				} else if (this.draggingBucket && this.draggingBucket != rack) {
					console.log('Dropping Rack');
					var new_buckets = arr.sortBy(this.buckets.slice(), 'ordering', true);
					arr.remove(new_buckets, (r) => { return r == this.draggingBucket });
					var i = new_buckets.indexOf(rack);
					if (rack.sortUpper) {
						new_buckets.splice(i, 0, this.draggingBucket);
					} else {
						new_buckets.splice(i+1, 0, this.draggingBucket);
					}
					new_buckets.forEach((r, ib) => {
						if (r.ordering != ib+1) {
							r.ordering = ib+1;
							r.saveOrdering();
						}
					});
					this.$root.setDraggingRack();
					rack.sortUpper = false;
					rack.sortLower = false;
				} else {
					event.preventDefault();
					event.stopPropagation();
				}
			},
			selectBucket(bucket) {
				this.$root.changeRack(bucket, true);
			},
			newBucket() {
				var bucket = new models.Rack({
					name: "",
					ordering: 0
				});
				this.$root.addRack(bucket);
				this.$root.setEditingRack(bucket);
			},
			/*selectRackThumbnail(rack) {
				try {
					var filePath = dialog.showOpenDialog(remote.getCurrentWindow(), {
						title: 'Import Thumbnail Image',
						filters: [{
							name: 'Image',
							extensions: ['png', 'jpg']
						}],
						properties: ['openFile']
					});
					if (filePath) {
						if (filePath.length == 1) filePath = filePath[0];
						if (rack.thumbnail) fs.unlinkSync(rack.thumbnail);
						var fileDestination = path.join(rack.path, 'thumb'+path.extname(filePath));
						filehelper.copyFileSync(filePath, fileDestination);
						rack.thumbnail = Datauri.sync(fileDestination);
					}
				} catch(err) {
					console.error(err);
				}
			},*/
			bucketMenu(bucket) {
				var menu = new Menu();

				if (this.selectedBucket == bucket) {
					menu.append(new MenuItem({
						label: 'Deselect bucket',
						click: () => {
							this.changeBucket(null);
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
				} else {
					menu.append(new MenuItem({
						label: 'Select bucket',
						click: () => {
							this.changeBucket(bucket, true);
						}
					}));
					menu.append(new MenuItem({type: 'separator'}));
				}

				menu.append(new MenuItem({
					label: 'Add new bucket',
					click: () => {
						this.newBucket();
					}
				}));

				if (!bucket.trash_bin && !bucket.quick_notes) {
					/*menu.append(new MenuItem({
						label: 'Set Bucket Thumbnail',
						click: () => {
							this.selectRackThumbnail(bucket);
						}
					}));*/
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({
						label: 'Rename bucket',
						click: () => {
							this.$root.setEditingRack(bucket);
						}
					}));
					menu.append(new MenuItem({
						label: 'Add subfolder',
						click: () => {
							this.addFolder(bucket);
						}
					}));

					if (bucket.icon) {
						menu.append(new MenuItem({type: 'separator'}));
						menu.append(new MenuItem({
							type: 'radio',
							label: 'Show label',
							checked: !bucket.hideLabel,
							click: () => {
								bucket.hideLabel = false;
								bucket.saveModel();
							}
						}));
						menu.append(new MenuItem({
							type: 'radio',
							label: 'Hide label',
							checked: bucket.hideLabel,
							click: () => {
								bucket.hideLabel = true;
								bucket.saveModel();
							}
						}));
					}
				}

				if (!bucket.trash_bin) {
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({
						label: 'Delete bucket',
						click: () => {
							if (confirm('Delete bucket "' + bucket.name + '" and its content?')) {
								this.$root.removeRack(bucket);
							}
						}
					}));
				}

				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>