import fs from 'fs'
import path from 'path'

import { remote } from 'electron'

import elosenv from './elosenv'

var settingsData = {}
var settingsFilename = 'epiphanyConfig.json'
var settingsPath

export default {
	init(filename) {
		if (filename) settingsFilename = filename
		settingsPath = path.join(elosenv.userDataPath(), settingsFilename)
		if (!fs.existsSync(settingsPath)) {
			settingsPath = path.join(elosenv.userDataPath(), settingsFilename)
		}

		try {
			settingsData = JSON.parse(fs.readFileSync(settingsPath))
		} catch (e) {
			console.error(e)
			settingsData = {}
		}
	},

	get(key) {
		return settingsData[key]
	},

	getSmart(key, defaultValue) {
		return typeof settingsData[key] === typeof defaultValue ? settingsData[key] : defaultValue
	},

	getJSON(key, defaultValue) {
		var value = settingsData[key]
		if (value && typeof value === 'string') {
			try {
				return JSON.parse(value)
			} catch (e) {
				return value
			}
		} else if (value) {
			return value
		}
		return defaultValue
	},

	set(key, value) {
		settingsData[key] = value
		if (settingsPath) {
			try {
				fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2))
			} catch (e) {
				console.error(e)
			}
		}
	},

	loadWindowSize() {
		var win = remote.getCurrentWindow()
		if (settingsData['screen_maximized']) {
			win.maximize()
		} else if (settingsData['screen_width'] && settingsData['screen_height']) {
			win.setSize(settingsData['screen_width'], settingsData['screen_height'])
		}
	},

	saveWindowSize() {
		var win = remote.getCurrentWindow()
		var currentSize = win.getSize()
		var currentBounds = win.getBounds()

		if (win.isMaximized()) {
			settingsData['screen_maximized'] = true
			settingsData['screen_width'] = currentSize[0]
			settingsData['screen_height'] = currentSize[1]
			settingsData['screen_x'] = currentBounds.x
			settingsData['screen_y'] = currentBounds.y
		} else {
			settingsData['screen_maximized'] = false
			settingsData['screen_width'] = currentSize[0]
			settingsData['screen_height'] = currentSize[1]
			settingsData['screen_x'] = currentBounds.x
			settingsData['screen_y'] = currentBounds.y
		}

		try {
			fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2))
		} catch (e) {
			console.error(e)
		}
	}
}
