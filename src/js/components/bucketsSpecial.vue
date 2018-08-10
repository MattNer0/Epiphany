<template lang="pug">
	.my-shelf-buckets(v-if="buckets.length > 0", @contextmenu.prevent.stop="")
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showSearch && !isFullScreen }"
			v-tooltip="{ 'content': 'Search', 'placement': 'left', 'boundariesElement': 'body' }")
			.rack-object.bucket-special(@click="openSearch()")
				a: i.rack-icon.coon-search
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showHistory && !isFullScreen }"
			v-tooltip="{ 'content': 'History', 'placement': 'left', 'boundariesElement': 'body' }")
			.rack-object.bucket-special(@click="openHistory()")
				a: i.rack-icon.coon-clock
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