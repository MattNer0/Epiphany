<template lang="pug">
	.title-bar-container
		.title-bar
			.address-bar(v-if="windowTitle")
				span {{ windowTitle }}
			.menu-bar(v-else-if="showMenuBar")
				nav: ul
					li.icon
					li(@click="file_menu") File
					li(@click="view_menu") View
					li(@click="tools_menu") Tools
					li(@click="quick_note")
						i.coon-plus
						|  New Quick Note
					li(@click="open_sidebar", v-if="isFullScreen")
						i.coon-sidebar
						|  Open Sidebar
					li(@click="close_sidebar", v-else)
						i.coon-sidebar
						|  Close Sidebar

			.system-icons(:class="{ 'darwin': isDarwin, 'popup' : windowTitle }")
				.system-icon(@click="win_min", v-if="!windowTitle")
					i.coon-underscore
				.system-icon(@click="win_max", v-if="!windowTitle")
					i.coon-square
				.system-icon.close-icon(@click="win_close")
					i.coon-x
</template>

<script>
	import { remote } from "electron";
	const { Menu, MenuItem } = remote;

	import path from "path";
	import elosenv from "../utils/elosenv";
	import Vue from "vue";

	import models from "../models";

	export default {
		name: 'titleBar',
		props: {
			'reduceToTray'      : Boolean,
			'isFullScreen'      : Boolean,
			'showMenuBar'       : Boolean,
			'libraryPath'       : String,
			'notesDisplayOrder' : String,
			'isToolbarEnabled'  : Boolean,
			'isFullWidthNote'   : Boolean,
			'showHidden'        : Boolean,
			'currentTheme'      : String,
			'windowTitle'       : String
		},
		data: function() {
			return {
				'isLinux'      : elosenv.isLinux(),
				'isDarwin'     : elosenv.isDarwin()
			};
		},
		methods: {
			win_close() {
				this.$root.closingWindow(!this.reduceToTray);
			},
			win_max() {
				var win = remote.getCurrentWindow();
				if(win.isMaximized()){
					win.unmaximize();
				} else {
					win.maximize();
				}
			},
			win_min() {
				var win = remote.getCurrentWindow();
				win.minimize();
			},
			resetSidebar() {
				this.$root.racksWidth = 220;
				this.$root.notesWidth = 220;
				this.$root.init_sidebar_width();
				Vue.nextTick(() => {
					this.$root.save_editor_size();
				});
			},
			quick_note() {
				this.$root.newQuickNote();
			},
			open_sidebar() {
				this.$root.setFullScreen(false);
			},
			close_sidebar() {
				this.$root.setFullScreen(true);
			},
			newBucket() {
				var bucket = new models.Rack({
					name: "",
					ordering: 0
				});
				this.$root.addRack(bucket);
				this.$root.setEditingRack(bucket);
			},
			popup_position(event) {
				var rect = event.target.getBoundingClientRect();
				return {
					window: remote.getCurrentWindow(),
					x: Math.floor(rect.x),
					y: Math.floor(rect.y)+event.target.offsetHeight
				}
			},
			file_menu(event) {
				var menu = new Menu();

				menu.append(new MenuItem({
					label: 'New Bucket',
					click: () => {
						this.newBucket();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Select Library Directory',
					click: () => {
						this.$root.openSync();
					}
				}));
				menu.append(new MenuItem({
					label: 'Move Library Directory',
					click: () => {
						this.$root.moveSync();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'About',
					click: () => {
						this.$root.openAbout();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Quit',
					click: () => {
						this.$root.closingWindow(true);
					}
				}));

				menu.popup(this.popup_position(event));
			},
			themes_submenu() {
				var themes_submenu = new Menu();
				themes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Dark',
					checked: this.currentTheme == 'dark',
					click: () => {
						this.$root.setCustomTheme("dark");
					}
				}));
				themes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Arc Dark',
					checked: this.currentTheme == 'arc-dark',
					click: () => {
						this.$root.setCustomTheme("arc-dark");
					}
				}));
				themes_submenu.append(new MenuItem({type: 'separator'}));
				themes_submenu.append(new MenuItem({
					label: 'Edit Theme',
					click: () => {
						this.$root.editThemeView();
					}
				}));
				themes_submenu.append(new MenuItem({
					label: 'Load Custom Theme',
					click: () => {
						this.$root.loadThemeFromFile();
					}
				}));
				return themes_submenu;
			},
			sort_submenu() {
				var sort_submenu = new Menu();
				sort_submenu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Update Date',
					checked: this.notesDisplayOrder == 'updatedAt',
					click: () => {
						this.$root.changeDisplayOrder('updatedAt');
					}
				}));
				sort_submenu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Creation Date',
					checked: this.notesDisplayOrder == 'createdAt',
					click: () => {
						this.$root.changeDisplayOrder('createdAt');
					}
				}));
				sort_submenu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Title',
					checked: this.notesDisplayOrder == 'title',
					click: () => {
						this.$root.changeDisplayOrder('title');
					}
				}));
				return sort_submenu;
			},
			buckets_submenu() {
				var buckets_submenu = new Menu();
				buckets_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Show Bin Bucket',
					checked: this.showHidden,
					click: () => {
						this.$root.showHidden = !this.showHidden;
					}
				}));
				return buckets_submenu;
			},
			notes_submenu() {
				var notes_submenu = new Menu();
				notes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Show Note Toolbar',
					checked: this.isToolbarEnabled,
					click: () => {
						this.$root.toggleToolbar();
					}
				}));
				notes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Show Note Full Width',
					checked: this.isFullWidthNote,
					click: () => {
						this.$root.toggleFullWidth();
					}
				}));

				return notes_submenu;
			},
			view_menu(event) {
				var menu = new Menu();

				menu.append(new MenuItem({
					label: 'Notes Order',
					submenu: this.sort_submenu()
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Buckets',
					submenu: this.buckets_submenu()
				}));
				menu.append(new MenuItem({
					label: 'Notes',
					submenu: this.notes_submenu()
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Theme',
					submenu: this.themes_submenu()
				}));

				menu.popup(this.popup_position(event));
			},
			tools_menu(event) {
				var menu = new Menu();

				menu.append(new MenuItem({
					type: 'checkbox',
					label: 'Reduce to Tray',
					checked: this.reduceToTray,
					click: () => {
						this.$root.reduceToTray = !this.reduceToTray;
					}
				}));
				menu.append(new MenuItem({
					label: 'Reset Sidebar Width',
					click: () => {
						this.resetSidebar();
					}
				}));

				menu.popup(this.popup_position(event));
			}
		}
	}
</script>