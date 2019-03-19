/**
 * @function s4
 * @return {String} Random string
 */
function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1)
}

export default {
	guid() {
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4()
	},
	timeUID() {
		var d = new Date()
		return d.valueOf() + '-' + s4() + s4()
	}
}

