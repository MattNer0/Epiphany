<template lang="pug">
	.noteBar.footer
		nav: ul
			li.right-align(v-if="selection == 0"): div
				| Words Count: {{ wordscount }}
			li.right-align(v-if="selection > 0"): div
				| Words in Selection: {{ wordscount }}
			li.right-align(v-if="selection > 0 && linebreaks > 0 && selection != linebreaks"): div
				| Linebreaks: {{ linebreaks }}
			li.right-align(v-if="selection > 0"): div
				| Selection: {{ selection }}
			li.right-align(v-if="selection == 0"): div
				| Column: {{ column }}
			li.right-align(v-if="selection == 0"): div
				| Line: {{ row+1 }}
</template>

<script>
export default {
	name    : 'noteMenu',
	computed: {
		row() {
			return this.$store.state.editor.editorRow
		},
		column() {
			return this.$store.state.editor.editorColumn
		},
		selection() {
			return this.$store.state.editor.editorSelection
		},
		wordscount() {
			return this.$store.state.editor.editorWordscount
		},
		linebreaks() {
			return this.$store.state.editor.editorLinebreaks
		}
	}
}
</script>
