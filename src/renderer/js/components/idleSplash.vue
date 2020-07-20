<template lang="pug">
	div
		table
			tr
				td
					strong Current path:
				td
					a(href="#", @click.prevent.stop="openLibrary" :alt="path")
						| {{ libraryPath }}&nbsp;
						i.coon-external-link
			tr
				td
					strong Sync:
				td
					i {{ syncMethod }}
			tr(v-if="dbsize > 0")
				td
					strong Cache Size:
				td
					i {{ dbsize }} notes
</template>

<script>
import { shell } from 'electron'
import path from 'path'

export default {
	name : 'idleSplash',
	props: {
		'path'  : String,
		'sync'  : String,
		'dbsize': Number
	},
	computed: {
		libraryPath() {
			if (this.path.length > 32) {
				const split = this.path.split(path.sep)
				if (split.length > 3) {
					return split[0] + path.sep + split[1] + path.sep + '...' + path.sep + split[split.length - 1]
				}
			}
			return this.path
		},
		syncMethod() {
			switch (this.sync) {
				case 'local':
					return 'Local'
				default:
					return 'Loading...'
			}
		}
	},
	methods: {
		openLibrary() {
			shell.openPath(this.path)
		}
	}
}
</script>
