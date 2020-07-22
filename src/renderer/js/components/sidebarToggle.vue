<template lang="pug">
	label.sidebar-toggle-label(@click="toggleSidebar")
		span(v-if="fullscreen")
			i.coon-chevron-right
		span(v-else)
			i.coon-x
</template>

<script>
export default {
	name    : 'sidebarToggle',
	computed: {
		fullscreen: {
			get() {
				return this.$store.state.options.isFullScreen
			}
		}
	},
	methods: {
		toggleSidebar() {
			this.$root.setFullScreen(!this.fullscreen)
		}
	}
}
</script>
