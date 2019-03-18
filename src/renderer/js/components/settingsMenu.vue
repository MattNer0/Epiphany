<template lang="pug">
	.my-shelf-folders
		.my-shelf-folder-bucket(@contextmenu.prevent.stop="")
			| Settings

		.my-shelf-folder-span
			| Library

		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="openSync")
				a.my-shelf-folder-name
					i.coon-folder
					|  Select Directory
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="moveSync")
				a.my-shelf-folder-name
					i.coon-folder
					|  Move Directory
			
		.my-shelf-folder: hr

		.my-shelf-folder-span
			| Buckets

		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="toggleHidden")
				a.my-shelf-folder-name
					i.coon-check-square(v-if="showHidden")
					i.coon-square(v-else)
					|  Show Hidden Bucket
		
		.my-shelf-folder: hr

		.my-shelf-folder-span
			| Notes

		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="toggleToolbar")
				a.my-shelf-folder-name
					i.coon-check-square(v-if="isToolbarEnabled")
					i.coon-square(v-else)
					|  Show Note Toolbar
			
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="toggleFullWidth")
				a.my-shelf-folder-name
					i.coon-check-square(v-if="isFullWidthNote")
					i.coon-square(v-else)
					|  Show Note Full Width

		.my-shelf-folder-span
			| Sort Notes by

		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="changeDisplayOrder('updatedAt')")
				a.my-shelf-folder-name
					i.coon-check-circle(v-if="notesDisplayOrder == 'updatedAt'")
					i.coon-circle(v-else)
					|  Update Date
			
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="changeDisplayOrder('createdAt')")
				a.my-shelf-folder-name
					i.coon-check-circle(v-if="notesDisplayOrder == 'createdAt'")
					i.coon-circle(v-else)
					|  Creation Date

			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="changeDisplayOrder('title')")
				a.my-shelf-folder-name
					i.coon-check-circle(v-if="notesDisplayOrder == 'title'")
					i.coon-circle(v-else)
					|  Title

		.my-shelf-folder: hr

		.my-shelf-folder-span
			| Themes
		
		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="setTheme('dark')")
				a.my-shelf-folder-name
					i.coon-check-circle(v-if="currentTheme == 'dark'")
					i.coon-circle(v-else)
					|  Dark
			
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="setTheme('arc-dark')")
				a.my-shelf-folder-name
					i.coon-check-circle(v-if="currentTheme == 'arc-dark'")
					i.coon-circle(v-else)
					|  Arc Dark

			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="setTheme('edit-custom')")
				a.my-shelf-folder-name
					i.coon-droplet
					|  Edit Custom Theme
			
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="setTheme('custom')")
				a.my-shelf-folder-name
					i.coon-droplet
					|  Load Custom Theme

		.my-shelf-folder: hr

		.my-shelf-folder-span
			| Application
		
		.my-shelf-folder-indent
			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="toggleReduceToTray")
					a.my-shelf-folder-name
						i.coon-check-square(v-if="reduceToTray")
						i.coon-square(v-else)
						|  Reduce to Tray

			.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="resetSidebar")
				a.my-shelf-folder-name
					i.coon-sidebar
					|  Reset Sidebar Width
		
		.my-shelf-folder: hr
		
		.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="openAbout")
			a.my-shelf-folder-name
				i.coon-info
				|  About
		
		.my-shelf-folder(@contextmenu.prevent.stop=""): .folder-object(@click="quit")
			a.my-shelf-folder-name
				i.coon-x-circle
				|  Quit Application
</template>

<script>
	export default {
		name: 'settingsMenu',
		props: {
			'isToolbarEnabled'  : Boolean,
			'isFullWidthNote'   : Boolean,
			'showHidden'        : Boolean,
			'reduceToTray'      : Boolean,
			'notesDisplayOrder' : String,
			'toggleToolbar'     : Function,
			'toggleFullWidth'   : Function,
			'currentTheme'      : String,
			'libraryPath'       : String,
			'openSync'          : Function,
			'moveSync'          : Function,
			'openAbout'         : Function,
			'changeDisplayOrder': Function
		},
		methods: {
			setTheme(theme_name) {
				if (theme_name == "custom") {
					this.$root.loadThemeFromFile();
					return;
				} else if (theme_name == "edit-custom") {
					this.$root.editThemeView();
					return;
				}
				this.$root.setCustomTheme(theme_name);
			},
			resetSidebar() {
				this.$root.racksWidth = 200;
				this.$root.notesWidth = 200;
				this.$root.init_sidebar_width();
				this.$nextTick(() => {
					this.$root.save_editor_size();
				});
			},
			toggleHidden() {
				this.$root.showHidden = !this.showHidden;
			},
			toggleReduceToTray() {
				this.$root.reduceToTray = !this.reduceToTray;
			},
			quit() {
				this.$root.closingWindow(true);
			}
		}
	}

</script>