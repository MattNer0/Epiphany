<template lang="pug">
	.link.my-notes-note-title(@click="open_note_menu", ref="addNote")
		i.coon-file-plus
		|  New Note
</template>

<script>
import { remote } from 'electron'
const { Menu, MenuItem } = remote

export default {
	name   : 'addNote',
	methods: {
		open_note_menu() {
			const menu = new Menu()

			menu.append(new MenuItem({
				label: 'New Simple Note',
				click: () => {
					window.bus.$emit('add-note')
				}
			}))
			menu.append(new MenuItem({
				label: 'Add Note from Url',
				click: () => {
					window.bus.$emit('add-note-from-url')
				}
			}))
			menu.append(new MenuItem({
				label: 'New Encrypted Note',
				click: () => {
					window.bus.$emit('add-encrypted-note')
				}
			}))
			menu.append(new MenuItem({
				label: 'New Outline',
				click: () => {
					window.bus.$emit('add-outline')
				}
			}))

			const nodeRect = this.$refs.addNote.getBoundingClientRect()
			menu.popup({
				window: remote.getCurrentWindow(),
				x     : Math.ceil(nodeRect.x),
				y     : Math.ceil(nodeRect.y)
			})
		}
	}
}
</script>
