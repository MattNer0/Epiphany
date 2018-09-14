import fs from "fs";

function readJson(file_path) {
	if (fs.existsSync(file_path)) {
		return JSON.parse(fs.readFileSync(file_path, 'utf-8'));
	}
	return {};
}

function writeOneKey(json_data, key, value) {
	if (value === undefined) {
		delete json_data[key];
	} else {
		json_data[key] = value;
	}
	return json_data;
}

function _writeKey(file_path, key, value) {
	var data = readJson(file_path);
	data = writeOneKey(data, key, value);
	fs.writeFileSync(file_path, JSON.stringify(data));
	return data;
}

export default {
	removeKey(file_path, key) {
		return _writeKey(file_path, key, undefined);
	},
	writeKey(file_path, key, value) {
		return _writeKey(file_path, key, value);
	},
	writeMultipleKeys(file_path, keys, values) {
		var data = readJson(file_path);
		for(var i=0; i<keys.length; i++) {
			data = writeOneKey(data, keys[i], values[i]);
		}
		fs.writeFileSync(file_path, JSON.stringify(data));
		return data;
	}
}