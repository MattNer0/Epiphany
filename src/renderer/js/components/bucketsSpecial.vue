<template lang="pug">
	.my-shelf-buckets(v-if="buckets.length > 0", @contextmenu.prevent.stop="")
		.my-shelf-rack(:class="{ 'isShelfSelected' : showHistory }")
			.rack-object.bucket-special(@click="openHistory()")
				i.rack-icon.coon-clock
				a History
</template>

<script>
export default {
	name : 'bucketsSpecial',
	props: {
		'buckets'    : Array,
		'showHistory': Boolean
	},
	methods: {
		openHistory() {
			this.$root.openHistory()
		}
	}
}
</script>
