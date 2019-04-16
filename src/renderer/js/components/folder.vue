<template lang="pug">
	.folder-object(
		v-bind:class="classObject",
		@click="selectFolder")
		i.coon-play-right.down(@click.prevent.stop="folder.openFolder = !folder.openFolder")
		a.my-shelf-folder-name.no-name(v-if="editingFolder != folder.uid")
			template(v-if="folder.name")
				| {{ folder.name }}
			template(v-else)
				| No Title
			span.my-shelf-folder-badge(v-if="search", v-show="folder.searchMatchName(search) || folder.searchnotes(search).length > 0")
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
			@blur="doneFolderEdit"
			@keyup.enter="doneFolderEdit"
			@keyup.esc="doneFolderEdit"
			type="text")

</template>

<script>
import Vue from 'vue'

import componentFolder from './folder.vue'

export default {
	name : 'folder',
	props: {
		'folder'       : Object,
		'editingFolder': String,
		'search'       : String,
		'fromBucket'   : Boolean
	},
	components: {
		'componentFolder': componentFolder
	},
	data() {
		return {
			'noSearchMatch': false
		}
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
		selectedFolder() {
			return this.$store.state.selectedFolder
		},
		selectedNote() {
			return this.$store.state.selectedNote
		},
		draggingFolder() {
			return this.$store.state.draggingFolder
		},
		draggingNote() {
			return this.$store.state.draggingNote
		},
		isDraggingNote() {
			return !!this.draggingNote
		},
		classObject() {
			return {
				'dragging'  : this.draggingFolder === this.folder,
				'no-results': !this.draggingFolder && !this.draggingNote && this.noSearchMatch
			}
		}
	},
	methods: {
		doneFolderEdit() {
			if (!this.editingFolder) { return }
			this.folder.saveModel()
			window.bus.$emit('change-folder', { folder: this.folder })
		},
		selectFolder() {
			if (this.selectedFolder === this.folder) {
				this.folder.openFolder = !this.folder.openFolder
			} else {
				if (this.fromBucket) {
					this.$root.closeOthers()
				}
				window.bus.$emit('change-folder', { folder: this.folder })
				if (!this.folder.openFolder) {
					this.folder.openFolder = true
				}
			}
		}
	},
	watch: {
		search() {
			this.noSearchMatch = this.search && !this.folder.searchMatchName(this.search) && this.folder.searchnotes(this.search).length === 0
		}
	}
}
</script>
