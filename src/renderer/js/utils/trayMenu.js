import { remote } from 'electron'
const Menu = remote.Menu

var mainWindow = null
var appIcon = null
var menuArray = []

export default {
	init() {
		mainWindow = remote.getCurrentWindow()
		appIcon = remote.getGlobal('appIcon')

		mainWindow.on('show', this.refreshTrayMenu)
		mainWindow.on('hide', this.refreshTrayMenu)
		this.refreshTrayMenu()
	},
	refreshTrayMenu() {

		var menuEntries = []
		if (mainWindow === null) {
			mainWindow = remote.getCurrentWindow()
		}

		if (mainWindow.isVisible()) {
			menuEntries.push({
				label: 'Show App',
				click() {
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
			click() {
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
			click() {
				remote.app.isQuiting = true
				remote.app.quit()
			}
		})
		var contextMenu = Menu.buildFromTemplate(menuEntries)

		appIcon.setContextMenu(contextMenu)

		if (mainWindow.isVisible()) {
			mainWindow.setVisibleOnAllWorkspaces(false)
		} else {
			mainWindow.setVisibleOnAllWorkspaces(true)
		}
	},
	setRacks(racks, rackfolderCallback, noteCallback) {
		menuArray = []
		var submenuElement = []
		var groupNum = 0

		for (var i = 0; i < racks.length; i++) {
			if (racks[i].data.separator) {
				groupNum += 1
				menuArray.push({
					label  : 'Rack Group ' + groupNum,
					submenu: submenuElement.slice()
				})
				submenuElement = []
			} else {
				submenuElement.push(this.oneRackMenuItem(racks[i], rackfolderCallback, noteCallback))
			}
		}
		if (submenuElement && groupNum === 0) {
			menuArray = submenuElement
		} else if (submenuElement) {
			groupNum += 1
			menuArray.push({
				label  : 'Rack Group ' + groupNum,
				submenu: submenuElement.slice()
			})
		}
		if (appIcon) this.refreshTrayMenu()
	},
	oneRackMenuItem(rack, rackfolderCallback, noteCallback) {
		var folderArray = []
		if (rack.folders) {
			for (var i = 0; i < rack.folders.length; i++) {
				folderArray.push(this.oneFolderMenuItem(rack.folders[i], rackfolderCallback, noteCallback))
			}
		}

		return {
			label  : rack.name,
			submenu: folderArray.length > 0 ? folderArray: undefined,
			click() {
				if (rackfolderCallback) rackfolderCallback(rack)
			}
		}
	},
	oneFolderMenuItem(folder, rackfolderCallback, noteCallback) {
		var noteArray = []
		if (folder.notes) {
			for (var i = 0; i < folder.notes.length; i++) {
				noteArray.push(this.oneNoteMenuItem(folder.notes[i], noteCallback))
			}
		}

		return {
			label  : folder.name,
			submenu: noteArray.length > 0 ? noteArray: undefined,
			click() {
				if (rackfolderCallback) rackfolderCallback(folder)
			}
		}
	},
	oneNoteMenuItem(note, noteCallback) {
		return {
			label: note.title,
			click() {
				if (!mainWindow.isVisible()) mainWindow.show()
				if (noteCallback) noteCallback(note)
			}
		}
	}
}
