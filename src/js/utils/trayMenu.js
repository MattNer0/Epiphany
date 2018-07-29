import electron from "electron";
const Menu = electron.remote.Menu;

var mainWindow = null;
var appIcon = null;
var menu_array = [];

export default {
	init() {
		mainWindow = electron.remote.getCurrentWindow();
		appIcon = electron.remote.getGlobal('appIcon');

		mainWindow.on('show', this.refreshTrayMenu);
		mainWindow.on('hide', this.refreshTrayMenu);
		this.refreshTrayMenu();
	},
	refreshTrayMenu() {

		var menu_entries = [];
		
		if (mainWindow.isVisible()) {
			menu_entries.push({
				label: 'Shop App',
				click() {
					if (mainWindow.isVisible()) {
						mainWindow.hide();
					}

					mainWindow.show();
					if (mainWindow.isMinimized()) mainWindow.restore();
				}
			});
		}

		menu_entries.push({
			label: mainWindow.isVisible() ? 'Minimize App' : 'Show App',
			click() {
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
					if (mainWindow.isMinimized()) mainWindow.restore();
				}
			}
		});
		menu_entries.push({ type: 'separator' });
		menu_entries.push({
			label: 'Quit',
			click() {
				electron.remote.app.isQuiting = true;
				electron.remote.app.quit();
			}
		});
		var contextMenu = Menu.buildFromTemplate(menu_entries);

		appIcon.setContextMenu(contextMenu);

		if (mainWindow.isVisible()) {
			mainWindow.setVisibleOnAllWorkspaces(false);
		} else {
			mainWindow.setVisibleOnAllWorkspaces(true);
		}
	},
	setRacks(racks, rackfolder_cb, note_cb) {
		menu_array = [];
		var submenu_element = [];
		var group_num = 0;
		for (var i = 0; i < racks.length; i++) {
			if (racks[i].data.separator) {
				group_num += 1;
				menu_array.push({
					label: 'Rack Group ' + group_num,
					submenu: submenu_element.slice()
				});
				submenu_element = [];
			} else {
				submenu_element.push(this.oneRackMenuItem(racks[i], rackfolder_cb, note_cb));
			}
		}
		if (submenu_element && group_num == 0) {
			menu_array = submenu_element;
		} else if (submenu_element) {
			group_num += 1;
			menu_array.push({
				label: 'Rack Group ' + group_num,
				submenu: submenu_element.slice()
			});
		}
		if (appIcon) this.refreshTrayMenu();
	},
	oneRackMenuItem(rack, rackfolder_cb, note_cb) {
		var folder_array = [];
		if (rack.folders) {
			for (var i = 0; i < rack.folders.length; i++) {
				folder_array.push(this.oneFolderMenuItem(rack.folders[i], rackfolder_cb, note_cb));
			}
		}

		return {
			label: rack.name,
			submenu: folder_array.length > 0 ? folder_array : undefined,
			click: function() {
				if (rackfolder_cb) rackfolder_cb(rack);
			}
		};
	},
	oneFolderMenuItem(folder, rackfolder_cb, note_cb) {
		var note_array = [];
		if (folder.notes) {
			for (var i = 0; i < folder.notes.length; i++) {
				note_array.push(this.oneNoteMenuItem(folder.notes[i], note_cb));
			}
		}

		return {
			label: folder.name,
			submenu: note_array.length > 0 ? note_array : undefined,
			click: function() {
				if (rackfolder_cb) rackfolder_cb(folder);
			}
		};
	},
	oneNoteMenuItem(note, note_cb) {
		return {
			label: note.title,
			click: function() {
				if (!mainWindow.isVisible()) mainWindow.show();
				if (note_cb) note_cb(note);
			}
		};
	}
};
