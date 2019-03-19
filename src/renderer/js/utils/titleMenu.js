import { remote } from 'electron'

export default {
	init() {
		this.refreshTitleMenu()
	},
	refreshTitleMenu() {
		var menuEntries = []
		menuEntries.push({
			label: 'Quit',
			click() {
				remote.app.isQuiting = true
				remote.app.quit()
			}
		})
		var contextMenu = remote.Menu.buildFromTemplate(menuEntries)
		remote.Menu.setApplicationMenu(contextMenu)
	}
}
