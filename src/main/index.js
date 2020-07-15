'use strict'

import path from 'path'
import fs from 'fs'
import { app, screen, protocol, ipcMain, Menu } from 'electron'
import { makeRendererWindow, makeBackgroundRendererWindow, windowName } from '../common/window'
import trayIcon from './tray'

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow
let popupWindow
let backgroundBrowserWindow

app.allowRendererProcessReuse = false

// support for portable mode
app.setPath(
	'userData',
	fs.existsSync(path.join(
		path.dirname(process.execPath),
		'.portable'
	)) ? path.join(path.dirname(process.execPath), 'userdata') : app.getPath('userData')
)

if (process.platform === 'linux' || process.platform === 'darwin') {
	app.setAboutPanelOptions({
		applicationName   : 'Epiphany',
		applicationVersion: '0.2.8',
		copyright         : 'MIT',
		website           : 'https://github.com/MattNer0/epiphany'
	})
}

var gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
	app.exit()
} else {
	app.on('second-instance', function(event, commandLine, workingDirectory) {
		// someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (!mainWindow.isVisible()) {
				mainWindow.show()
			}
			if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.focus()
		} else {
			mainWindow = createMainWindow()
		}
	})
}

if (process.platform === 'linux') {
	app.disableHardwareAcceleration()
}

function setApplicationMenu() {
	var template = [
		{
			label  : 'Application',
			submenu: [
				{
					label   : 'About Application',
					selector: 'orderFrontStandardAboutPanel:'
				},
				{ type: 'separator' },
				{
					label      : 'Quit',
					accelerator: 'Command+Q',
					click      : function() {
						app.quit()
					}
				}
			]
		},
		{
			label  : 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
				{ label: 'Redo', accelerator: 'CmdOrCtrl+Y', selector: 'redo:' },
				{ type: 'separator' },
				{ label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
				{ label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
				{ label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
				{ label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
			]
		}
	]

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Create main BrowserWindow when electron is ready
function createMainWindow() {
	const settingsPath = path.join(app.getPath('userData'), 'epiphanyConfig.json')
	let settingsData = null
	try {
		settingsData = JSON.parse(fs.readFileSync(settingsPath))
	} catch (e) {
		settingsData = {}
	}

	const WINDOW_WIDTH = settingsData.screen_width || 1024
	const WINDOW_HEIGHT = settingsData.screen_height || 768
	let WINDOW_CENTER = true
	let WINDOW_X
	let WINDOW_Y

	//let WINDOW_RECT_X = settingsData['screen_x']
	//let WINDOW_RECT_Y = settingsData['screen_y']

	if (process.platform === 'linux') {
		const bounds = screen.getPrimaryDisplay().bounds
		WINDOW_X = bounds.x + ((bounds.width - WINDOW_WIDTH) / 2)
		WINDOW_Y = bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2)
		WINDOW_CENTER = false
	}

	// create the browser window.
	const conf = {
		width            : WINDOW_WIDTH,
		height           : WINDOW_HEIGHT,
		x                : WINDOW_X,
		y                : WINDOW_Y,
		minWidth         : 768,
		minHeight        : 432,
		center           : WINDOW_CENTER,
		title            : 'Epiphany',
		backgroundColor  : '#000',
		show             : false,
		darkTheme        : true,
		tabbingIdentifier: 'epiphany',
		frame            : false,
		webPreferences   : {
			nodeIntegration        : true,
			nodeIntegrationInWorker: true,
			enableRemoteModule     : true,
			contextIsolation       : false,
			devTools               : isDevelopment,
			webgl                  : false,
			webaudio               : false,
			backgroundThrottling   : true
		}
	}

	if (process.platform === 'linux') {
		conf.icon = path.join(__static, 'icon.png')
	}

	const window = makeRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.application
		},
		windowOptions: conf
	})

	if (isDevelopment) {
		window.webContents.on('did-frame-finish-load', () => {
			window.webContents.openDevTools()
		})
	}

	window.on('closed', () => {
		mainWindow = null
	})

	window.webContents.on('devtools-opened', () => {
		window.focus()
		setImmediate(() => {
			window.focus()
		})
	})

	if (process.platform === 'linux' || process.platform === 'darwin') {
		setApplicationMenu()
	}

	return window
}

function createBrowserWindow(callback) {
	if (mainWindow === null) return

	const window = makeBackgroundRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.browser
		},
		windowOptions: {
			skipTaskbar   : true,
			webPreferences: {
				devTools          : false,
				nodeIntegration   : true,
				enableRemoteModule: true,
				contextIsolation  : false
			}
		},
		callback: callback
	}, 'bbrowser')

	window.on('closed', () => {
		backgroundBrowserWindow = null
	})

	return window
}

function createPopupWindow(width, height, callback) {
	if (mainWindow === null) return

	const wSize = mainWindow.getSize()
	const wBounds = mainWindow.getBounds()

	const conf = {
		width         : Math.ceil(wSize[0]*0.6),
		height        : Math.ceil(wSize[1]*0.6),
		modal         : true,
		parent        : mainWindow,
		alwaysOnTop   : true,
		skipTaskbar   : true,
		darkTheme     : true,
		frame         : false,
		webPreferences: {
			devTools          : isDevelopment,
			nodeIntegration   : true,
			enableRemoteModule: true,
			contextIsolation  : false
		}
	}

	switch (height) {
		case 'small':
			conf.height = Math.max(Math.ceil(wSize[1]*0.2), 200)
			conf.width = Math.max(Math.ceil(wSize[0]*0.4), 320)
			break
		case 'medium':
			conf.height = Math.max(Math.ceil(wSize[1]*0.2), 250)
			conf.width = Math.max(Math.ceil(wSize[0]*0.4), 350)
			break
	}

	switch (width) {
		case 'small':
			conf.width = Math.max(Math.ceil(wSize[0]*0.3), 320)
			break
	}

	conf.x = wBounds.x+Math.floor(wBounds.width * 0.5)-Math.floor(conf.width * 0.5)
	conf.y = wBounds.y+Math.floor(wBounds.height * 0.5)-Math.floor(conf.height * 0.5)

	const window = makeRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.dialog
		},
		windowOptions: conf,
		callback     : callback
	}, 'popup')

	/*if (isDevelopment) {
		window.webContents.openDevTools()
	}*/

	window.on('closed', () => {
		popupWindow = null
	})

	return window
}

app.on('window-all-closed', () => {
	app.quit()
	/*if (process.platform !== 'darwin') {
		// on macOS it is common for applications to stay open until the user explicitly quits
	}*/
})

app.on('activate', () => {
	// on macOS it is common to re-create a window even after all windows have been closed
	if (mainWindow === null) {
		mainWindow = createMainWindow()
	}
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
	protocol.registerFileProtocol('epiphany', (request, callback) => {
		const url = request.url.substr(11)
		callback({ path: path.normalize(decodeURI(url)) })
	}, (err) => {
		if (err) console.error('Failed to register protocol')
	})

	mainWindow = createMainWindow()

	global.appIcon = trayIcon(mainWindow, app)
	global.isDarwin = process.platform === 'darwin'
	global.isLinux = process.platform === 'linux'
	global.isDebug = isDevelopment
	global.argv = process.argv

	// relay events to background task
	ipcMain.on('load-page', (event, payload) => {
		if (backgroundBrowserWindow) {
			backgroundBrowserWindow.webContents.send('load-page', payload)
		} else {
			backgroundBrowserWindow = createBrowserWindow(() => {
				backgroundBrowserWindow.webContents.send('load-page', payload)
			})
		}
	})

	ipcMain.on('kill-bbrowser', (event, payload) => {
		if (backgroundBrowserWindow) backgroundBrowserWindow.close()
	})

	ipcMain.on('open-popup', (event, payload) => {
		if (popupWindow) {
			popupWindow.webContents.send('open-popup', payload)
		} else {
			popupWindow = createPopupWindow(payload.width, payload.height, () => {
				popupWindow.webContents.send('open-popup', payload)
			})
		}
	})

	// relay events to main task
	ipcMain.on('load-page-fail', (event, payload) => mainWindow.webContents.send('load-page-fail', payload))
	ipcMain.on('load-page-success', (event, payload) => mainWindow.webContents.send('load-page-success', payload))
	ipcMain.on('load-page-favicon', (event, payload) => mainWindow.webContents.send('load-page-favicon', payload))
	ipcMain.on('load-page-finish', (event, payload) => mainWindow.webContents.send('load-page-finish', payload))

	ipcMain.on('bucket-rename', (event, payload) => mainWindow.webContents.send('bucket-rename', payload))
})
