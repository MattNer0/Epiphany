<template lang="pug">
	.noteBar
		nav: ul(:class="{'transparent' : !isToolbarEnabled }")
			li.right-align
				a(@click="menu_save", href="#", title="Save")
					i.coon-save
					|  Save
</template>

<script>
export default {
	name : 'themeMenu',
	props: {
		'theme': Object
	},
	computed: {
		isToolbarEnabled: {
			get() {
				return this.$store.state.options.isToolbarEnabled
			}
		}
	},
	methods: {
		menu_save() {
			this.$root.setCustomTheme(this.theme)
		}
	}
}
</script>
