import electron from "electron";
const Menu = electron.remote.Menu;

export default {
	init() {
		this.refreshTitleMenu();
	},
	refreshTitleMenu() {
		var menu_entries = [];
		menu_entries.push({
			label: 'Quit',
			click() {
				electron.remote.app.isQuiting = true;
				electron.remote.app.quit();
			}
		});
		var contextMenu = Menu.buildFromTemplate(menu_entries);

		Menu.setApplicationMenu(contextMenu);
	}
}