<template lang="pug">
	.tabs-bar(v-if="tabsArray.length > 1")
		div
			.tab(v-for="(note, index) in tabsArray", @click.prevent.stop="selectNote(note)", :class="{ 'selected': note == currentNote }")
				i.coon-x.close(@click.prevent.stop="removeTab(note, index)")
				i.coon-lock(v-if="note.isEncryptedNote && note.isEncrypted")
				i.coon-unlock(v-else-if="note.isEncryptedNote && !note.isEncrypted")
				i.coon-file-outline(v-else-if="note.isOutline")
				i.coon-file-text(v-else)
				|  {{ note.title }}
</template>

<script>
export default {
	name    : 'tabsBar',
	computed: {
		currentNote() {
			return this.$store.state.library.selectedNote
		},
		tabsArray: {
			get() {
				return this.$store.state.library.noteTabs
			}
		}
	},
	methods: {
		selectNote(note) {
			window.bus.$emit('change-note', { note: note })
		},
		removeTab(note, index) {
			if (note === this.currentNote) {
				if (index > 0) {
					window.bus.$emit('change-note', { note: this.tabsArray[index-1] })
				} else if (this.tabsArray.length > 1) {
					window.bus.$emit('change-note', { note: this.tabsArray[index+1] })
				} else {
					window.bus.$emit('change-note', { note: null })
				}
			}
			this.$store.commit('library/removeTabByIndex', index)
		}
	}
}
</script>
