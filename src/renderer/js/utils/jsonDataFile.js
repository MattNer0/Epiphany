import fs from 'fs'

function readJson(filePath) {
	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
	}
	return {}
}

function writeOneKey(jsonData, key, value) {
	if (value === undefined) {
		delete jsonData[key]
	} else {
		jsonData[key] = value
	}
	return jsonData
}

function _writeKey(filePath, key, value) {
	var data = readJson(filePath)
	data = writeOneKey(data, key, value)
	fs.writeFileSync(filePath, JSON.stringify(data))
	return data
}

export default {
	removeKey(filePath, key) {
		return _writeKey(filePath, key, undefined)
	},
	writeKey(filePath, key, value) {
		return _writeKey(filePath, key, value)
	},
	writeMultipleKeys(filePath, keys, values) {
		var data = readJson(filePath)
		for (var i=0; i<keys.length; i++) {
			data = writeOneKey(data, keys[i], values[i])
		}
		fs.writeFileSync(filePath, JSON.stringify(data))
		return data
	}
}
