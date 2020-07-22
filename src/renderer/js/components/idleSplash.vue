<template lang="pug">
	div(v-if="!loading")
		table
			tr(v-if="note")
				td(style="width: 96px;")
					strong Last Note:
				td
					a(href="#", @click.prevent.stop="openNote")
						| {{ note.title }}&nbsp;
						i.coon-external-link
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
		'path'   : String,
		'sync'   : String,
		'loading': Boolean
	},
	computed: {
		note() {
			return this.$store.getters['library/lastNote']
		},
		dbsize: {
			get() {
				return this.$store.state.library.databaseSize
			}
		},

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
		},
		openNote() {
			window.bus.$emit('change-note', { note: this.note })
		}
	}
}
</script>
