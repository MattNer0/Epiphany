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
	name : 'tabsBar',
	props: {
		'currentNote': Object,
		'tabsArray'  : Array
	},
	computed: {
	},
	methods: {
		selectNote(note) {
			this.$root.changeNote(note)
		},
		removeTab(note, index) {
			if (note === this.currentNote) {
				if (index > 0) {
					this.$root.changeNote(this.tabsArray[index-1])
				} else if (this.tabsArray.length > 1) {
					this.$root.changeNote(this.tabsArray[index+1])
				} else {
					this.$root.changeNote(null)
				}
			}
			this.$root.noteTabs.splice(index, 1)
		}
	}
}
</script>
