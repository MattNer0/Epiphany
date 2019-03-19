<template lang="pug">
	div
		p
			| Epiphany is an open-source application built with Electron and Vue.
			br
			|
			| Epiphany was originally a fork of PileMd.
		p(v-if="libraryPath")
			| Current Library Path:
			br
			| {{ libraryPath }}
			a(href="#", @click.prevent.stop="openLibrary")
				i.coon-external-link
			br
			br
		p
			i.coon-github
			|
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
			shell.showItemInFolder(this.libraryPath)
		}
	}
}
</script>
