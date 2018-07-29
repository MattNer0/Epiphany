<template lang="pug">
	.my-shelf-buckets.fixed-bottom(@contextmenu.prevent.stop="")
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showSettings && !isFullScreen }"
			v-tooltip="{ 'content': 'Settings', 'placement': 'left' }")
			.rack-object.bucket-special(@click="openSettings()")
				a: i.rack-icon.coon-menu
</template>

<script>

	export default {
		name: 'bucketsMenu',
		props: {
			'showSettings' : Boolean,
			'isFullScreen' : Boolean,
		},
		methods: {
			openSettings() {
				this.$root.openSettings();
			},
		}
	}

</script>