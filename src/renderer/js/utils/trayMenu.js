import { remote } from 'electron'
import { refreshTrayMenuWithWindow } from '../../../common/tray'

var mainWindow = null
var appIcon = null

export default {
	init() {
		mainWindow = remote.getCurrentWindow()
		appIcon = remote.getGlobal('appIcon')

		mainWindow.on('show', this.refreshTrayMenu)
		this.refreshTrayMenu()
	},
	refreshTrayMenu() {
		if (mainWindow === null) {
			mainWindow = remote.getCurrentWindow()
		}
		refreshTrayMenuWithWindow(mainWindow, appIcon, remote)
	}
}
