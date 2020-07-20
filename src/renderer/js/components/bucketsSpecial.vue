<template lang="pug">
	.my-shelf-buckets(v-if="buckets.length > 0", @contextmenu.prevent.stop="")
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showHistory }"
			@contextmenu.prevent.stop="bucketMenu()")
			.rack-object.bucket-special(@click="openHistory()")
				i.rack-icon.coon-clock
				a History
</template>

<script>
import { remote } from 'electron'
const { Menu, MenuItem } = remote

export default {
	name : 'bucketsSpecial',
	props: {
		'showHistory': Boolean
	},
	computed: {
		buckets() {
			return this.$store.state.buckets
		}
	},
	methods: {
		openHistory() {
			this.$root.openHistory()
		},
		bucketMenu() {
			if (this.showHistory) {
				var menu = new Menu()
				menu.append(new MenuItem({
					label: 'Deselect',
					click: () => {
						window.bus.$emit('change-note', { note: null })
						this.$root.closeOthers()
						this.$root.update_editor_size()
					}
				}))
				menu.popup()
			}
		}
	}
}
</script>
