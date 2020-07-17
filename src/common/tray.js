export function refreshTrayMenuWithWindow(mainWindow, appIcon, remote) {
	const menuEntries = []
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
				mainWindow.minimize()
				setTimeout(() => {
					mainWindow.hide()
				}, 2000)
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
