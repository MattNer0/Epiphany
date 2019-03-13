import fs from "fs";
import path from "path";

import { remote } from 'electron';

import elosenv from "./elosenv";

var settings_data = {};
var settings_filename = 'epiphanyConfig.json';
var settings_path;

export default {
	init(filename) {
		if (filename) settings_filename = filename;
		settings_path = path.join(elosenv.userDataPath(), settings_filename);
		if (!fs.existsSync(settings_path)) {
			settings_path = path.join(elosenv.userDataPath(), settings_filename);
		}

		try {
			settings_data = JSON.parse(fs.readFileSync(settings_path));
		} catch (e) {
			console.error(e);
			settings_data = {};
		}
	},

	get(key) {
		return settings_data[key];
	},

	getSmart(key, default_value) {
		return typeof settings_data[key] == typeof default_value ? settings_data[key] : default_value;
	},

	getJSON(key, default_value) {
		var value = settings_data[key];
		if (value && typeof value == "string") {
			try {
				return JSON.parse(value);
			} catch(e) {
				return value;
			}
		} else if (value) {
			return value;
		}
		return default_value;
	},

	set(key, value) {
		settings_data[key] = value;
		if (settings_path) {
			try {
				fs.writeFileSync(settings_path, JSON.stringify(settings_data, null, 2));
			} catch (e) {
				console.error(e);
			}
		}
	},

	loadWindowSize() {
		var win = remote.getCurrentWindow();
		if (settings_data['screen_maximized']) {
			win.maximize();
		} else if (settings_data['screen_width'] && settings_data['screen_height']) {
			win.setSize(settings_data['screen_width'] , settings_data['screen_height']);
		}
	},

	saveWindowSize() {
		var win = remote.getCurrentWindow();
		var current_size = win.getSize();
		var current_bounds = win.getBounds();

		if (win.isMaximized()) {
			settings_data['screen_maximized'] = true;
			settings_data['screen_width'] = current_size[0];
			settings_data['screen_height'] = current_size[1];
			settings_data['screen_x'] = current_bounds.x;
			settings_data['screen_y'] = current_bounds.y;
		} else {
			settings_data['screen_maximized'] = false;
			settings_data['screen_width'] = current_size[0];
			settings_data['screen_height'] = current_size[1];
			settings_data['screen_x'] = current_bounds.x;
			settings_data['screen_y'] = current_bounds.y;
		}

		try {
			fs.writeFileSync(settings_path, JSON.stringify(settings_data, null, 2));
		} catch (e) {
			console.error(e);
		}
	}
};
