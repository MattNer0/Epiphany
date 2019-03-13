<template lang="pug">
	.my-shelf-buckets(v-if="buckets.length > 0", @contextmenu.prevent.stop="")
		.my-shelf-rack(:class="{ 'isShelfSelected' : showSearch && !isFullScreen }")
			.rack-object.bucket-special(@click="openSearch()")
				i.rack-icon.coon-search
				a Search
		.my-shelf-rack(:class="{ 'isShelfSelected' : showHistory && !isFullScreen }")
			.rack-object.bucket-special(@click="openHistory()")
				i.rack-icon.coon-clock
				a History
</template>

<script>

	export default {
		name: 'bucketsSpecial',
		props: {
			'buckets'             : Array,
			'selectedBucket'      : Object,
			'isFullScreen'        : Boolean,
			'toggleFullScreen'    : Function,
			'showHistory'         : Boolean,
			'showSearch'          : Boolean
		},
		methods: {
			openHistory() {
				this.$root.openHistory();
			},
			openSearch() {
				this.$root.openSearch();
			}
		}
	}

</script>