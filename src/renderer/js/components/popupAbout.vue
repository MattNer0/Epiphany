<template lang="pug">
	div
		p
			| Epiphany is a Digital Journal to write down and organize your ideas.
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
