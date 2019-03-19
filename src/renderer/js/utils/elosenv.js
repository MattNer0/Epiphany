import { remote } from 'electron'
import log from 'electron-log'
import path from 'path'

export default {
	homePath() {
		return remote.app.getPath('home')
	},
	documentsPath() {
		return remote.app.getPath('documents')
	},
	appDataPath() {
		return remote.app.getPath('appData')
	},
	userDataPath() {
		return remote.app.getPath('userData')
	},
	tempPath() {
		return remote.app.getPath('temp')
	},
	workingDirectory() {
		var exe = remote.app.getPath('exe')
		return path.dirname(exe)
	},
	isDarwin() {
		return remote.getGlobal('isDarwin')
	},
	isLinux() {
		return remote.getGlobal('isLinux')
	},
	isDebug() {
		return remote.getGlobal('isDebug')
	},
	console: {
		log: (message) => {
			log.info(message)
		},
		warn: (message) => {
			log.warn(message)
		},
		error: (message) => {
			log.error(message)
		}
	}
}
