<template lang="pug">
	.my-editor-theme
		theme-field(v-for="csskey in themeKeys", v-bind:key="csskey", :value="theme[csskey]", :csskey="csskey")
</template>

<script>
	import component_themeField from './themeField.vue';

	export default {
		name: 'themeEditor',
		props: {
			'theme': Object
		},
		components: {
			'themeField' : component_themeField
		},
		computed: {
			themeKeys() {
				return this.theme !== null ? Object.keys(this.theme).sort() : [];
			}
		},
		methods: {
			setValue(csskey, new_value) {
				this.$root.editTheme[csskey] = new_value;
			}
		}
	}
</script>