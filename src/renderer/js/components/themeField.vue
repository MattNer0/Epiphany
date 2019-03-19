<template lang="pug">
	.theme-field
		.label {{ csskey }}
		.input
			.color-preview-container
				.color-preview(v-bind:style="background_style")
			input(type="text", :name="csskey", v-model="myvalue")
</template>

<script>
export default {
	name : 'themeEditor',
	props: {
		'csskey': String,
		'value' : String
	},
	data() {
		return {
			myvalue: ''
		}
	},
	mounted() {
		this.myvalue = this.value
	},
	computed: {
		background_style() {
			return {
				backgroundColor: this.myvalue
			}
		}
	},
	watch: {
		myvalue() {
			this.$parent.setValue(this.csskey, this.myvalue)
		}
	}
}
</script>
