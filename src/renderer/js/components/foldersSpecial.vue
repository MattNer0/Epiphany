<template lang="pug">
	.my-shelf-folders
		.my-shelf-folder.my-all(
			v-if="bucket.folders.length > 1 && bucket.allnotes.length > 0",
			@contextmenu.prevent.stop="",
			:class="{ 'isShelfSelected': showAll && selectedBucket }")
			.folder-object(@click="selectAll(bucket)", :class="{ 'dragging' : draggingFolder }")
				a.my-shelf-folder-name
					i.coon-list
					|  All
					span.my-shelf-folder-badge(v-if="search", v-show="bucket.searchMatchName(search) || bucket.searchnotes(search).length > 0")
						| {{ bucket.searchnotes(search).length }}
						i.coon-file
					span.my-shelf-folder-badge(v-else)
						| {{ bucket.allnotes.length }}
						i.coon-file

		.my-shelf-folder.my-favorites(
			@contextmenu.prevent.stop="",
			v-if="bucket.folders.length > 0 && bucket.starrednotes.length > 0"
			:class="{ 'isShelfSelected': showFavorites && selectedBucket }")
			.folder-object(@click="selectFavorites(bucket)", :class="{ 'dragging' : draggingFolder }")
				a.my-shelf-folder-name
					i.coon-star
					|  Favorites
					span.my-shelf-folder-badge(v-if="search", v-show="bucket.searchMatchName(search) || bucket.searchstarrednotes(search).length > 0")
						| {{ bucket.searchstarrednotes(search).length }}
						i.coon-file
					span.my-shelf-folder-badge(v-else)
						| {{ bucket.starrednotes.length }}
						i.coon-file
</template>

<script>
export default {
	name : 'foldersSpecial',
	props: {
		'bucket'        : Object,
		'selectedBucket': Boolean,
		'showAll'       : Boolean,
		'showFavorites' : Boolean,
		'search'        : String
	},
	computed: {
		draggingFolder() {
			return this.$store.state.draggingFolder
		}
	},
	methods: {
		selectAll(bucket) {
			this.$root.showAllRack(bucket)
		},
		selectFavorites(bucket) {
			this.$root.showFavoritesRack(bucket)
		}
	}
}
</script>
