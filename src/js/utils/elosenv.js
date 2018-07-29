import { ipcRenderer, remote } from "electron";
import path from "path";

export default {
	homePath() {
		return remote.app.getPath('home');
	},
	documentsPath() {
		return remote.app.getPath('documents');
	},
	appDataPath() {
		return remote.app.getPath('appData');
	},
	userDataPath() {
		return remote.app.getPath('userData');
	},
	tempPath() {
		return remote.app.getPath('temp');
	},
	workingDirectory() {
		var exe = remote.app.getPath('exe');
		return path.dirname(exe);
	},
	isDarwin() {
		return remote.getGlobal("isDarwin");
	},
	isLinux() {
		return remote.getGlobal("isLinux");
	},
	isDebug() {
		return remote.getGlobal("isDebug");
	},
	console: {
		log(message) {
			ipcRenderer.send("console", "[LOG] " + message);
		},
		warn(message) {
			ipcRenderer.send("console", "[WARN] " + message);
		},
		error(message) {
			ipcRenderer.send("console", "[ERROR] " + message);
		}
	}
};
