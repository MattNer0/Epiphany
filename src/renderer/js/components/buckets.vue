<template lang="pug">
	.my-shelf-buckets(:class="{ 'draggingRack' : draggingBucket, 'draggingFolder' : draggingFolder }")
		.my-shelf-rack(v-for="bucket in bucketsWithFolders"
			:class="classBucket(bucket)"
			:draggable="editingFolder === null && !bucket.quick_notes"
			@dragstart.stop="rackDragStart($event, bucket)"
			@dragend.stop="rackDragEnd()"
			@dragover="rackDragOver($event, bucket)"
			@dragleave.stop="rackDragLeave(bucket)"
			@drop.stop="dropToRack($event, bucket)"
			@contextmenu.prevent.stop="bucketMenu(bucket)")
			.rack-object(v-bind:class="classBucketObject(bucket)", @click="selectBucket(bucket)")
				template(v-if="bucket.icon")
					i.rack-icon(:class="'coon-'+bucket.icon")
					a {{ bucket.quick_notes ? 'Quick Notes' : bucket.name }}
				template(v-else)
					i.rack-icon.coon-play-right.down(@click.prevent.stop="bucket.openFolder = !bucket.openFolder")
					a {{ bucket.name }}

			folders-special(
				v-if="!bucket.quick_notes && bucket.folders"
				:bucket="bucket"
				:show-all="showAll"
				:show-favorites="showFavorites"
				:selected-bucket="selectedBucket === bucket"
				:dragging-folder="draggingFolder"
				:search="search"
				)

			folders(
				v-if="!bucket.quick_notes && bucket.folders && (!search || bucket.searchMatchName(search) || bucket.searchnotes(search).length > 0)"
				:parent-folder="bucket"
				:selected-note="selectedNote"
				:selected-folder="selectedFolder"
				:dragging-folder="draggingFolder"
				:dragging-note="draggingNote"
				:change-bucket="changeBucket"
				:change-folder="changeFolder"
				:editing-folder="editingFolder"
				:from-bucket="true"
				:search="search")

		.my-shelf-rack
			.rack-object.bucket-special(@click="newBucket()")
				i.rack-icon.coon-plus
				a New bucket

</template>

<script>
import { remote } from 'electron'
const { Menu, MenuItem } = remote
import Vue from 'vue'
import arr from '../utils/arr'
import dragging from '../utils/dragging'
import models from '../models'

import componentFolders from './folders.vue'
import componentFoldersSpecial from './foldersSpecial.vue'

export default {
	name      : 'buckets',
	components: {
		'folders'       : componentFolders,
		'foldersSpecial': componentFoldersSpecial
	},
	props: {
		'buckets'       : Array,
		'selectedBucket': Object,
		'selectedFolder': Object,
		'selectedNote'  : Object,
		'draggingBucket': Object,
		'draggingFolder': Object,
		'draggingNote'  : Object,
		'showAll'       : Boolean,
		'showFavorites' : Boolean,
		'isFullScreen'  : Boolean,
		'changeBucket'  : Function,
		'changeFolder'  : Function,
		'editingFolder' : String,
		'search'        : String
	},
	directives: {
		focus(element) {
			if (!element) return
			Vue.nextTick(() => {
				element.focus()
			})
		}
	},
	computed: {
		bucketsWithFolders() {
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			return this.buckets.sort(function(a, b) {
				return a.ordering - b.ordering
			})
		}
	},
	methods: {
		classBucket(bucket) {
			if (bucket) {
				return {
					'isShelfSelected': (this.selectedBucket === bucket && bucket.quick_notes && !this.isDraggingNote && !this.isFullScreen) || bucket.dragHover,
					//'noCursor'       : !bucket.quick_notes,
					'openFolder'     : bucket.openFolder,
					'sortUpper'      : bucket.sortUpper,
					'sortLower'      : bucket.sortLower
				}
			}
		},
		classBucketObject(bucket) {
			return {
				'dragging'  : this.draggingBucket === bucket,
				'no-results': !this.draggingBucket && !this.draggingNote && this.noSearchMatch(bucket)
			}
		},
		noSearchMatch(bucket) {
			return this.search && !bucket.searchMatchName(this.search) && bucket.searchnotes(this.search).length === 0
		},
		// Dragging
		rackDragStart(event, bucket) {
			event.dataTransfer.setDragImage(event.target, 0, 0)
			this.$root.setDraggingRack(bucket)
		},
		rackDragEnd() {
			this.$root.setDraggingRack()
			this.changeBucket(null)
		},
		rackDragOver(event, bucket) {
			event.preventDefault()
			if (this.draggingFolder) {
				bucket.dragHover = true
			} else if (this.draggingBucket && this.draggingBucket !== bucket) {
				var per = dragging.dragOverPercentage(event.currentTarget, event.clientY)
				if (per > 0.5) {
					bucket.sortLower = true
					bucket.sortUpper = false
				} else {
					bucket.sortLower = false
					bucket.sortUpper = true
				}
			} else if (this.draggingNote) {
				if (this.selectedBucket !== bucket) this.selectBucket(bucket)
			}
		},
		rackDragLeave(bucket) {
			bucket.dragHover = false
			bucket.sortUpper = false
			bucket.sortLower = false
		},
		addFolder(rack) {
			if (!rack) return
			var folder
			folder = new models.Folder({
				'name'        : '',
				'rack'        : rack,
				'parentFolder': undefined,
				'rackUid'     : rack.uid,
				'ordering'    : 0
			})
			this.$root.addFolderToRack(rack, folder)
			this.$root.setEditingFolder(folder)
		},
		/**
		 * Handles dropping a rack or a folder inside a rack.
		 * @param  {Object}  event   drag event
		 * @param  {Object}  rack    current rack
		 */
		dropToRack(event, rack) {
			if (this.draggingFolder) {
				console.log('Dropping to rack')
				var draggingFolder = this.draggingFolder
				// Drop Folder to Rack

				var folders = arr.sortBy(rack.folders.slice(), 'ordering', true)
				if (draggingFolder.data.rack !== rack) {
					arr.remove(draggingFolder.data.rack.folders, (f) => { return f === draggingFolder })
					draggingFolder.rack = rack
				}
				draggingFolder.ordering = 0
				folders.unshift(draggingFolder)
				folders.forEach((f) => {
					f.ordering += 1
					f.saveModel()
				})
				rack.folders = folders
				rack.dragHover = false
				this.$root.setDraggingFolder()
			} else if (this.draggingBucket && this.draggingBucket !== rack) {
				console.log('Dropping Rack')
				var newBuckets = arr.sortBy(this.buckets.slice(), 'ordering', true)
				arr.remove(newBuckets, (r) => { return r === this.draggingBucket })
				var i = newBuckets.indexOf(rack)
				if (rack.sortUpper) {
					newBuckets.splice(i, 0, this.draggingBucket)
				} else {
					newBuckets.splice(i+1, 0, this.draggingBucket)
				}
				newBuckets.forEach((r, ib) => {
					if (r.ordering !== ib + 1) {
						r.ordering = ib + 1
						r.saveOrdering()
					}
				})
				this.$root.setDraggingRack()
				rack.sortUpper = false
				rack.sortLower = false
			} else {
				event.preventDefault()
				event.stopPropagation()
			}
		},
		selectBucket(bucket) {
			if (this.selectedBucket === bucket) {
				bucket.openFolder = !bucket.openFolder
			} else {
				this.$root.changeRack(bucket, true)
				bucket.openFolder = true
			}
		},
		newBucket() {
			var bucket = new models.Rack({
				name    : '',
				ordering: this.buckets.length
			})
			this.$root.addRack(bucket)
			this.$root.setEditingRack(bucket)
		},
		bucketMenu(bucket) {
			var menu = new Menu()

			menu.append(new MenuItem({
				label: 'Add new bucket',
				click: () => {
					this.newBucket()
				}
			}))

			if (!bucket.quick_notes) {
				menu.append(new MenuItem({ type: 'separator' }))
				menu.append(new MenuItem({
					label: 'Rename bucket',
					click: () => {
						this.$root.setEditingRack(bucket)
					}
				}))
				menu.append(new MenuItem({
					label: 'Add subfolder',
					click: () => {
						this.addFolder(bucket)
					}
				}))

				if (bucket.icon) {
					menu.append(new MenuItem({ type: 'separator' }))
					menu.append(new MenuItem({
						type   : 'radio',
						label  : 'Show label',
						checked: !bucket.hideLabel,
						click  : () => {
							bucket.hideLabel = false
							bucket.saveModel()
						}
					}))
					menu.append(new MenuItem({
						type   : 'radio',
						label  : 'Hide label',
						checked: bucket.hideLabel,
						click  : () => {
							bucket.hideLabel = true
							bucket.saveModel()
						}
					}))
				}
			}

			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Delete bucket',
				click: () => {
					if (confirm('Delete bucket "' + bucket.name + '" and its content?')) {
						this.$root.removeRack(bucket)
					}
				}
			}))

			menu.popup(remote.getCurrentWindow())
		}
	}
}
</script>
