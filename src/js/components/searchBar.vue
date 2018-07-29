<template lang="pug">
	.my-search
		input#search-bar(v-model="mysearch", type="text", placeholder="Search...", @keydown.enter.exact.prevent="newSearch")
		i.coon-x-circle(v-show="mysearch", @click="clear_search")
</template>

<script>
	export default {
		name: 'searchBar',
		data() {
			return {
				mysearch: ""
			};
		},
		props: {
			'search' : String
		},
		mounted() {
			this.mysearch = this.search;
		},
		methods: {
			clear_search() {
				this.mysearch = "";
				this.$root.changeFolder(null);
			},
			newSearch() {
				this.$root.search = this.mysearch;
			},
		},
		watch: {
			mysearch() {
				this.$root.search = this.mysearch;
			}
		}
	}
</script>