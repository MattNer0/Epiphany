<template lang="pug">
	.cell-container.main-cell-container(:class="mainCellClass" :style="containerStyle")
		tabs-bar
		note-menu(
			v-if="isNoteSelected || isOutlineSelected"
			:is-note-selected="isNoteSelected"
			:is-outline-selected="isOutlineSelected")
		theme-menu(
			v-else-if="isThemeSelected"
			:theme="editTheme")
		.main-note-container(v-if="showNoteContainer")
			div.my-editor(ref="myEditor")
				outline(v-if="isOutlineSelected")
				theme-editor(
					v-else-if="isThemeSelected"
					:theme="editTheme")
				template(v-else)
					codemirror(
						v-show="!isPreview"
						ref="refCodeMirror")
					.my-editor-preview(
						v-show="isPreview"
						@contextmenu.prevent.stop="previewMenu()")
						div(v-html="preview")
		note-footer(
			v-if="isNoteSelected && !isOutlineSelected"
			v-show="!isPreview && isToolbarEnabled"
		)

</template>

<script>
import { remote, clipboard } from 'electron'
const { Menu, MenuItem } = remote

import componentTabsBar from './tabsBar.vue'
import componentNoteMenu from './noteMenu.vue'
import componentNoteFooter from './noteFooter.vue'
import componentOutline from './outline.vue'
import componentCodeMirror from './codemirror.vue'
import componentThemeEditor from './themeEditor.vue'
import componentThemeMenu from './themeMenu.vue'

import preview from '../preview'
import models from '../models'

export default {
	name      : 'noteContainer',
	components: {
		'codemirror' : componentCodeMirror,
		'outline'    : componentOutline,
		'themeEditor': componentThemeEditor,
		'themeMenu'  : componentThemeMenu,
		'tabsBar'    : componentTabsBar,
		'noteMenu'   : componentNoteMenu,
		'noteFooter' : componentNoteFooter
	},
	data() {
		return {
			preview: ''
		}
	},
	props: {
		isThemeSelected: {
			type   : Boolean,
			default: false
		}
	},
	computed: {
		selectedNote() {
			return this.$store.state.library.selectedNote
		},
		noteTabs: {
			get() {
				return this.$store.state.library.noteTabs
			}
		},

		isFullWidthNote: {
			get() {
				return this.$store.state.options.isFullWidthNote
			}
		},
		isToolbarEnabled: {
			get() {
				return this.$store.state.options.isToolbarEnabled
			}
		},
		isPreview: {
			get() {
				return this.$store.state.options.isPreview
			},
			set(val) {
				this.$store.commit('options/setPreviewFlag', val)
			}
		},
		fontsize: {
			get() {
				return this.$store.state.options.fontsize
			}
		},
		showNoteContainer() {
			return this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected
		},
		containerStyle() {
			return {
				'margin-left': this.$store.state.editor.containerMargin
			}
		},
		mainCellClass() {
			var classes = ['font' + this.fontsize]
			if (this.noteTabs.length > 1) classes.push('tabs-open')
			if (this.isFullWidthNote) classes.push('full-note')
			if (this.isNoteSelected || this.isOutlineSelected || this.isThemeSelected) classes.push('note-open')
			if (!this.isToolbarEnabled) classes.push('notebar-disabled')
			return classes
		},

		isNoteSelected() {
			if (this.selectedNote instanceof models.Note) return true
			return false
		},
		isOutlineSelected() {
			if (this.selectedNote instanceof models.Outline) return true
			return false
		}
	},
	methods: {
		/**
		 * displays context menu on the selected note in preview mode.
		 * @function previewMenu
		 * @return {Void} Function doesn't return anything
		 */
		previewMenu() {
			const menu = new Menu()

			menu.append(new MenuItem({
				label      : 'Copy',
				accelerator: 'CmdOrCtrl+C',
				click      : () => { document.execCommand('copy') }
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Copy to clipboard (Markdown)',
				click: () => {
					if (this.selectedNote) clipboard.writeText(this.selectedNote.bodyWithDataURL)
				}
			}))
			menu.append(new MenuItem({
				label: 'Copy to clipboard (HTML)',
				click: () => {
					if (this.preview) clipboard.writeText(this.preview)
				}
			}))
			menu.append(new MenuItem({ type: 'separator' }))
			menu.append(new MenuItem({
				label: 'Toggle Preview',
				click: () => {
					this.isPreview = !this.isPreview
				}
			}))
			menu.popup()
		},
		scrollUpScrollbarNote() {
			this.$nextTick(() => {
				this.$refs.myEditor.scrollTop = 0
			})
		},
		updatePreview() {
			if (this.isPreview && this.selectedNote) {
				this.preview = preview.render(this.selectedNote, this)
				//if (noScroll === undefined) this.scrollUpScrollbarNote()
			} else {
				this.preview = ''
			}
		}
	},
	watch: {
		fontsize() {
			if (this.selectedNote) {
				this.$nextTick(() => {
					this.$refs.refCodeMirror.refreshCM()
				})
			}
		},
		selectedNote() {
			if (this.isPreview) {
				this.$nextTick(() => {
					this.$refs.refCodeMirror.refreshCM()
				})
			}
		},
		isPreview() {
			this.updatePreview()
		}
	}
}
</script>
