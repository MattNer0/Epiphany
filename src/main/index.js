'use strict'

import path from "path";
import fs from "fs";
import { app, screen, protocol, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log';
import { makeRendererWindow, makeBackgroundRendererWindow, windowName } from '../common/window';
import trayIcon from './tray'

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow
let backgroundWindow
let popupWindow
let backgroundBrowserWindow

// support for portable mode
app.setPath(
	'userData',
	fs.existsSync(path.join(
		path.dirname(process.execPath),
		'.portable'
	)) == true ? path.join(path.dirname(process.execPath), 'userdata') : app.getPath("userData")
);

var gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.exit();
} else {
	app.on('second-instance', function(event, commandLine, workingDirectory) {
		// someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (!mainWindow.isVisible()) {
				mainWindow.show();
			}
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		} else {
			if (!backgroundWindow) backgroundWindow = createBackgroundWindow();
			mainWindow = createMainWindow();
		}
	});
}

if (process.platform == 'linux') {
	app.disableHardwareAcceleration();
}

// Create main BrowserWindow when electron is ready
function createMainWindow() {
	var settings_path = path.join(app.getPath('userData'), 'epiphanyConfig.json');
	var settings_data = null;
	try {
		settings_data = JSON.parse(fs.readFileSync(settings_path));
	} catch (e) {
		settings_data = {};
	}

	var WINDOW_WIDTH = settings_data['screen_width'] || 1024;
	var WINDOW_HEIGHT = settings_data['screen_height'] || 768;
	var WINDOW_CENTER = true;
	var WINDOW_X;
	var WINDOW_Y;

	var WINDOW_RECT_X = settings_data['screen_x'];
	var WINDOW_RECT_Y = settings_data['screen_y'];

	if (process.platform == 'linux') {
		let bounds = screen.getPrimaryDisplay().bounds;
		WINDOW_X = bounds.x + ((bounds.width - WINDOW_WIDTH) / 2);
		WINDOW_Y = bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2);
		WINDOW_CENTER = false;
	}

	// create the browser window.
	let conf = {
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
			nodeIntegration     : true,
			contextIsolation    : false,
			devTools            : isDevelopment,
			webgl               : false,
			webaudio            : false,
			backgroundThrottling: true
		}
	};

	if (process.platform == 'linux') {
		conf['icon'] = path.join(__static, 'icon.png');
	}

	const window = makeRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.application
		},
		windowOptions: conf
	});

	if (isDevelopment) {
		window.webContents.openDevTools()
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

	return window
}

function createBackgroundWindow() {
	const window = makeBackgroundRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.background
		},
		windowOptions: {
			webPreferences: {
				nodeIntegration     : true,
				contextIsolation    : false
			}
		}
	});

	window.on('closed', () => {
		backgroundWindow = null
	})

	return window
}

function createBrowserWindow(callback) {
	if (mainWindow === null) return;

	const window = makeBackgroundRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.browser
		},
		windowOptions: {
			webPreferences: {
				nodeIntegration     : false,
				contextIsolation    : true
			}
		},
		callback     : callback
	});

	window.on('closed', () => {
		backgroundBrowserWindow = null
	})

	return window
}

function createPopupWindow(width, height, callback) {
	if (mainWindow === null) return;

	let wSize = mainWindow.getSize();
	let wBounds = mainWindow.getBounds();

	let conf = {
		width            : Math.ceil(wSize[0]*0.6),
		height           : Math.ceil(wSize[1]*0.6),
		modal            : true,
		parent           : mainWindow,
		alwaysOnTop      : true,
		darkTheme        : true,
		frame            : false,
		webPreferences: {
			nodeIntegration     : true,
			contextIsolation    : false
		}
	}

	switch(height) {
		case "small":
			conf.height = Math.max(Math.ceil(wSize[1]*0.2), 200);
			conf.width = Math.max(Math.ceil(wSize[0]*0.4), 320);
			break;
		case "medium":
			conf.height = Math.max(Math.ceil(wSize[1]*0.2), 250);
			conf.width = Math.max(Math.ceil(wSize[0]*0.4), 350);
			break;
	}

	switch(width) {
		case "small":
			conf.width = Math.max(Math.ceil(wSize[0]*0.3), 320);
			break;
	}

	conf.x = wBounds.x+Math.floor(wBounds.width*0.5)-Math.floor(conf.width*0.5);
	conf.y = wBounds.y+Math.floor(wBounds.height*0.5)-Math.floor(conf.height*0.5);

	const window = makeRendererWindow(isDevelopment, {
		data: {
			windowName: windowName.dialog
		},
		windowOptions: conf,
		callback     : callback
	});

	window.on('closed', () => {
		popupWindow = null
	})

	return window
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
	// on macOS it is common for applications to stay open until the user explicitly quits
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	// on macOS it is common to re-create a window even after all windows have been closed
	if (mainWindow === null) {
		mainWindow = createMainWindow()
	}
	if (backgroundWindow === null) {
		backgroundWindow = createBackgroundWindow()
	}
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {

	protocol.registerFileProtocol('epiphany', (request, callback) => {
		const url = request.url.substr(9);
		callback({ path: path.normalize(decodeURI(url)) });
	}, (err) => {
		if (err) console.error('Failed to register protocol');
	});

	mainWindow = createMainWindow()
	backgroundWindow = createBackgroundWindow()

	global.appIcon = trayIcon(mainWindow, app);
	global.isDarwin = process.platform == 'darwin';
	global.isLinux = process.platform == 'linux';
	global.isDebug = isDevelopment;
	global.argv = process.argv;

	ipcMain.on('download-btn', (e, args) => {
		download(BrowserWindow.getFocusedWindow(), args.url, args.options).then((dl) => {
			log.info('Saved to '+ dl.getSavePath())
		}).catch(log.error);
	});
	
	// relay events to background task
	ipcMain.on('download-files', (event, payload) => backgroundWindow.webContents.send('download-files', payload));
	ipcMain.on('load-racks', (event, payload) => backgroundWindow.webContents.send('load-racks', payload));
	ipcMain.on('cache-note', (event, payload) => backgroundWindow.webContents.send('cache-note', payload));
	ipcMain.on('load-page', (event, payload) => {
		if (backgroundBrowserWindow) {
			backgroundBrowserWindow.webContents.send('load-page', payload);
		} else {
			backgroundBrowserWindow = createBrowserWindow(() => {
				backgroundBrowserWindow.webContents.send('load-page', payload);
			});
		}
	});
	
	ipcMain.on('kill-bbrowser', (event, payload) => {
		if (backgroundBrowserWindow) backgroundBrowserWindow.close();
	});

	ipcMain.on('open-popup', (event, payload) => {
		if (popupWindow) {
			popupWindow.webContents.send('open-popup', payload);
		} else {
			popupWindow = createPopupWindow(payload.width, payload.height, () => {
				popupWindow.webContents.send('open-popup', payload);
			});
		}
	});
	
	// relay events to main task
	ipcMain.on('loaded-racks', (event, payload) => mainWindow.webContents.send('loaded-racks', payload));
	ipcMain.on('loaded-folders', (event, payload) => mainWindow.webContents.send('loaded-folders', payload));
	ipcMain.on('loaded-notes', (event, payload) => mainWindow.webContents.send('loaded-notes', payload));
	ipcMain.on('loaded-all-notes', (event, payload) => {
		mainWindow.webContents.send('loaded-all-notes', payload);
		//start watching file changes
		//backgroundWindow.webContents.send('loaded-all-notes', payload);
	});
	
	ipcMain.on('load-page-fail', (event, payload) => mainWindow.webContents.send('load-page-fail', payload));
	ipcMain.on('load-page-success', (event, payload) => mainWindow.webContents.send('load-page-success', payload));
	ipcMain.on('load-page-favicon', (event, payload) => mainWindow.webContents.send('load-page-favicon', payload));
	ipcMain.on('load-page-finish', (event, payload) => mainWindow.webContents.send('load-page-finish', payload));

	ipcMain.on('download-files-failed', (event, payload) => mainWindow.webContents.send('download-files-failed', payload));

	ipcMain.on('bucket-rename', (event, payload) => mainWindow.webContents.send('bucket-rename', payload));
})
