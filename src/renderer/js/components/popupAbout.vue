<template lang="pug">
	div
		p
			| Epiphany is an open-source note application built with Electron and Vue.
		p
			i.coon-github
			| &nbsp;
			a(href="#", @click.prevent.stop="openRepo") Github Repository
</template>

<script>
import { shell } from 'electron'

export default {
	name   : 'about',
	methods: {
		openRepo() {
			shell.openExternal('https://github.com/MattNer0/epiphany')
		}
	}
}
</script>
