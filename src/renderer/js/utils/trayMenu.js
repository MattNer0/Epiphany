import { remote } from 'electron'

var mainWindow = null
var appIcon = null

export default {
	init() {
		mainWindow = remote.getCurrentWindow()
		appIcon = remote.getGlobal('appIcon')

		mainWindow.on('show', this.refreshTrayMenu)
		mainWindow.on('hide', this.refreshTrayMenu)
		this.refreshTrayMenu()
	},
	refreshTrayMenu() {
		const menuEntries = []
		if (mainWindow === null) {
			mainWindow = remote.getCurrentWindow()
		}

		if (mainWindow.isVisible()) {
			menuEntries.push({
				label: 'Show App',
				click: () => {
					if (mainWindow.isVisible()) {
						mainWindow.hide()
					}

					mainWindow.show()
					if (mainWindow.isMinimized()) mainWindow.restore()
				}
			})
		}

		menuEntries.push({
			label: mainWindow.isVisible() ? 'Minimize App' : 'Show App',
			click: () => {
				if (mainWindow.isVisible()) {
					mainWindow.hide()
				} else {
					mainWindow.show()
					if (mainWindow.isMinimized()) mainWindow.restore()
				}
			}
		})
		menuEntries.push({ type: 'separator' })
		menuEntries.push({
			label: 'Quit',
			click: () => {
				remote.app.isQuiting = true
				remote.app.quit()
			}
		})

		const contextMenu = remote.Menu.buildFromTemplate(menuEntries)
		appIcon.setContextMenu(contextMenu)

		if (mainWindow.isVisible()) {
			mainWindow.setVisibleOnAllWorkspaces(false)
		} else {
			mainWindow.setVisibleOnAllWorkspaces(true)
		}
	}
}
