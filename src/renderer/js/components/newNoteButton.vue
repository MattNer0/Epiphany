<template lang="pug">
	div(v-if="!loading")
		button(@click="createNewQuickNote")
			i.coon-plus
			strong New Quick Note
</template>

<script>
export default {
	name : 'newNoteButton',
	props: {
		'loading': Boolean
	},
	methods: {
		createNewQuickNote() {
			this.$root.newQuickNote()
		}
	}
}
</script>
