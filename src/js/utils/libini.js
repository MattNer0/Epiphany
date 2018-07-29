import fs from "fs";
import path from "path";
import ini from "ini";

function iniPath(library_path, fileName) {
	if (!fileName) fileName = '.library.ini';
	return path.join(library_path, fileName);
}

function readIni(library_path, fileName) {
	if (fs.existsSync(iniPath(library_path, fileName))) {
		return ini.parse(fs.readFileSync(iniPath(library_path, fileName), 'utf-8'));
	}
	return {};
}

function readKeyByIni(library_path, fileName, key) {
	if (typeof key === 'string') {
		return readIni(library_path, fileName)[key];
	} else if (key.length == 2) {
		var value = readIni(library_path, fileName)[key[0]];
		if (value) {
			return value[key[1]];
		}
	}
}

function writeOneKey(config, key, value) {
	if (typeof key === 'string') {
		if (value === undefined) {
			if (config[key]) delete config[key];
		} else {
			config[key] = value;
		}
	} else if (key.length == 2) {
		if (!config[key[0]]) config[key[0]] = {};
		if (value === undefined) {
			delete config[key[0]][key[1]];
		} else {
			config[key[0]][key[1]] = value;
		}
	}
	return config;
}

function writeKeyByIni(library_path, fileName, key, value) {
	var config = readIni(library_path, fileName);
	config = writeOneKey(config, key, value);
	fs.writeFileSync(iniPath(library_path, fileName), ini.stringify(config));
}

export default {
	readKey(library_path, key) {
		return readKeyByIni(library_path, '.library.ini', key);
	},
	writeKey(library_path, key, value) {
		writeKeyByIni(library_path, '.library.ini', key, value);
	},
	readKeyAsArray(library_path, key) {
		var keyvalue = this.readKey(library_path, key);
		var newArray = [];
		if (keyvalue) {
			var keys = Object.keys(keyvalue);
			for (var i = 0; i < keys.length; i++) {
				newArray.push({
					key: keys[i],
					value: keyvalue[keys[i]]
				});
			}
		}
		return newArray;
	},
	pushKey(library_path, key, value, maxlength) {
		var keyvalue = this.readKey(library_path, key);
		value = String(value);
		if (!keyvalue || typeof keyvalue === 'string') keyvalue = [];
		if (keyvalue.indexOf(value) == -1) {
			keyvalue.unshift(value);
			if (maxlength) keyvalue = keyvalue.slice(0, maxlength);
			this.writeKey(library_path, key, keyvalue);
		}
	},
	popKey(library_path, key) {
		var element;
		var keyvalue = this.readKey(library_path, key);
		if (!keyvalue || typeof keyvalue === 'string') keyvalue = [];
		if (keyvalue.length > 0) element = keyvalue.pop();
		this.writeKey(library_path, key, keyvalue);
		return element;
	},
	removeKey(library_path, key) {
		this.writeKey(library_path, key, undefined);
	},
	removeKeyByIni(library_path, fileName, key) {
		this.writeKeyByIni(library_path, fileName, key, undefined);
	},
	writeMultipleKeysByIni(library_path, fileName, keys, values) {
		if (keys.length == values.length) {
			var config = readIni(library_path, fileName);
			for (var i=0; i<keys.length; i++) {
				config = writeOneKey(config, keys[i], values[i]);
			}
			fs.writeFileSync(iniPath(library_path, fileName), ini.stringify(config));
		}
	},
	readKeyByIni: readKeyByIni,
	writeKeyByIni: writeKeyByIni,
	readIniFile: readIni
};
