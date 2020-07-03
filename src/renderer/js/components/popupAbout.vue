<template lang="pug">
	div
		p
			| Epiphany is an open-source note application built with Electron and Vue.
		p(v-if="libraryPath")
			| Current Library Path:
			br
			| {{ libraryPath }}
			| &nbsp;
			a(href="#", @click.prevent.stop="openLibrary")
				i.coon-external-link
			br
			br
		p
			i.coon-github
			| &nbsp;
			a(href="#", @click.prevent.stop="openRepo") Github Repository
</template>

<script>
import { shell } from 'electron'

export default {
	name : 'about',
	props: {
		'libraryPath': String
	},
	methods: {
		openRepo() {
			shell.openExternal('https://github.com/MattNer0/epiphany')
		},
		openLibrary() {
			shell.openPath(this.libraryPath)
		}
	}
}
</script>
