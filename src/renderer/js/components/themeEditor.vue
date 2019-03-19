<template lang="pug">
	.my-editor-theme
		theme-field(v-for="csskey in themeKeys", v-bind:key="csskey", :value="theme[csskey]", :csskey="csskey")
</template>

<script>
import componentThemeField from './themeField.vue'

export default {
	name : 'themeEditor',
	props: {
		'theme': Object
	},
	components: {
		'themeField': componentThemeField
	},
	computed: {
		themeKeys() {
			return this.theme !== null ? Object.keys(this.theme).sort() : []
		}
	},
	methods: {
		setValue(csskey, newValue) {
			this.$root.editTheme[csskey] = newValue
		}
	}
}
</script>
